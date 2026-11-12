#!/bin/bash
set -euo pipefail

readonly SQLCMD=/opt/mssql-tools18/bin/sqlcmd
readonly DB_NAME="${DB_NAME:-FreelanceMarketplaceDB}"
readonly DB_USER="${DB_USER:-marketplace_app}"

if [[ ! "$DB_NAME" =~ ^[A-Za-z0-9_]+$ || "$DB_USER" != marketplace_app ]]; then
  echo "Refusing unsafe database/user identifier." >&2
  exit 2
fi
if [[ ! "${DB_PASSWORD:-}" =~ ^[A-Za-z0-9@%+=:_-]{20,128}$ ]]; then
  echo "DB_PASSWORD must be 20-128 safe characters; regenerate the local Docker env file." >&2
  exit 2
fi
if [[ ! -x "$SQLCMD" ]]; then
  echo "sqlcmd is missing from the SQL Server image." >&2
  exit 2
fi

sql() {
  "$SQLCMD" -C -S sqlserver -U sa -P "$MSSQL_SA_PASSWORD" -d master -b -h -1 -W "$@"
}

status_sql="SET NOCOUNT ON;
IF DB_ID(N'${DB_NAME}') IS NULL SELECT N'missing';
ELSE IF
  (SELECT COUNT(*) FROM [${DB_NAME}].sys.tables WHERE schema_id=1 AND name IN
    (N'Users',N'AdminAccounts',N'UserProfiles',N'Skills',N'UserSkills',N'Categories',N'UserPortfolios',N'UserCertificates',N'Projects',N'ProjectCategories',N'ProjectSkills',N'Proposals')) = 12
  AND (SELECT COUNT(*) FROM [${DB_NAME}].sys.triggers WHERE name IN
    (N'TR_Users_HashPassword',N'TR_AdminAccounts_RequireAdminUser',N'TR_Projects_RegularEmployerOnly',N'TR_UserProfiles_RegularUsersOnly',N'TR_UserSkills_RegularUsersOnly',N'TR_UserPortfolios_RegularUsersOnly',N'TR_UserCertificates_RegularUsersOnly',N'TR_Proposals_ValidateAndAccept')) = 8
  SELECT N'complete';
ELSE SELECT N'partial';"
status="$(sql -Q "$status_sql" | tr -d '\r\n[:space:]')"

case "$status" in
  missing)
    echo "Database ${DB_NAME} is absent on the new Docker SQL volume; creating the project schema."
    sql -Q "CREATE DATABASE [${DB_NAME}];"
    "$SQLCMD" -C -S sqlserver -U sa -P "$MSSQL_SA_PASSWORD" -d master -b -i /schema/schema.sql
    status="$(sql -Q "$status_sql" | tr -d '\r\n[:space:]')"
    if [[ "$status" != complete ]]; then
      echo "Schema initialization did not produce the complete expected tables/triggers; preserving the database for inspection." >&2
      exit 1
    fi
    ;;
  complete)
    echo "Existing ${DB_NAME} schema verified; preserving all marketplace records and skipping schema.sql."
    ;;
  *)
    echo "${DB_NAME} exists but does not match the complete expected schema; refusing to modify it." >&2
    exit 1
    ;;
esac

printf "IF NOT EXISTS (SELECT 1 FROM sys.sql_logins WHERE name = N'marketplace_app') CREATE LOGIN [marketplace_app] WITH PASSWORD = N'%s', CHECK_POLICY=ON, CHECK_EXPIRATION=OFF; ELSE ALTER LOGIN [marketplace_app] WITH PASSWORD = N'%s';\n" \
  "$DB_PASSWORD" "$DB_PASSWORD" > /tmp/marketplace-app-login.sql
"$SQLCMD" -C -S sqlserver -U sa -P "$MSSQL_SA_PASSWORD" -d master -b -i /tmp/marketplace-app-login.sql
rm -f /tmp/marketplace-app-login.sql
"$SQLCMD" -C -S sqlserver -U sa -P "$MSSQL_SA_PASSWORD" -d "$DB_NAME" -b \
  -Q "IF DATABASE_PRINCIPAL_ID(N'marketplace_app') IS NULL CREATE USER [marketplace_app] FOR LOGIN [marketplace_app]; IF IS_ROLEMEMBER(N'db_owner', N'marketplace_app') <> 1 ALTER ROLE [db_owner] ADD MEMBER [marketplace_app];"

echo "Database schema is ready and the Django service login is provisioned."
