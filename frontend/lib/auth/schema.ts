import { z } from "zod";
export const loginSchema = z.object({
  email: z.string().trim().min(1, "ایمیل خود را وارد کنید.").max(255, "ایمیل بیش از حد طولانی است.").email("یک آدرس ایمیل معتبر وارد کنید."),
  password: z.string().min(1, "رمز عبور خود را وارد کنید.").max(1024, "رمز عبور بیش از حد طولانی است."),
});
export type LoginValues = z.infer<typeof loginSchema>;
export const registerSchema = z.object({
  fullName: z.string().trim().min(1, "نام و نام خانوادگی خود را وارد کنید.").max(200, "نام و نام خانوادگی بیش از حد طولانی است."),
  email: loginSchema.shape.email,
  password: z.string().min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد.").max(1024, "رمز عبور بیش از حد طولانی است."),
  confirmPassword: z.string().min(1, "تکرار رمز عبور را وارد کنید."),
}).refine((values) => values.password === values.confirmPassword, { message: "رمز عبور و تکرار آن یکسان نیستند.", path: ["confirmPassword"] });
export type RegisterValues = z.infer<typeof registerSchema>;
export const forgotPasswordSchema = loginSchema.pick({ email: true });
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
