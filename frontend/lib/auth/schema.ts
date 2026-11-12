import { z } from "zod";
export const loginSchema = z.object({
  email: z.string().trim().min(1, "ایمیل خود را وارد کنید.").max(255, "ایمیل بیش از حد طولانی است.").email("یک آدرس ایمیل معتبر وارد کنید."),
  password: z.string().min(1, "رمز عبور خود را وارد کنید.").max(1024, "رمز عبور بیش از حد طولانی است."),
});
export type LoginValues = z.infer<typeof loginSchema>;
