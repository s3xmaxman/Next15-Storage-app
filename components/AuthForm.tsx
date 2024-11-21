"use client";
import { set, z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createAccount } from "@/lib/actions/user.actions";

type FormType = "sign-in" | "sign-up";

const authFormSchema = (formType: FormType) => {
  return z.object({
    email: z.string().email(),
    fullName:
      formType === "sign-up"
        ? z.string().min(2).max(50)
        : z.string().optional(),
  });
};

const AuthForm = ({ type }: { type: FormType }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [accountId, setAccountId] = useState(null);

  const formSchema = authFormSchema(type);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const user =
        type === "sign-up"
          ? await createAccount({
              fullName: values.fullName || "",
              email: values.email,
            })
          : null;

      setAccountId(user.accountId);
    } catch {
      setErrorMessage("Failed to create account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="auth-form">
        <h1 className="form-title">
          {type === "sign-in" ? "サインイン" : "サインアップ"}
        </h1>
        {type === "sign-up" && (
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <div className="shad-form-item">
                  <FormLabel className="shad-form-label">氏名</FormLabel>

                  <FormControl>
                    <Input
                      placeholder="氏名を入力してください"
                      className="shad-input"
                      {...field}
                    />
                  </FormControl>
                </div>

                <FormMessage className="shad-form-message" />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <div className="shad-form-item">
                <FormLabel className="shad-form-label">
                  メールアドレス
                </FormLabel>

                <FormControl>
                  <Input
                    placeholder="メールアドレスを入力してください"
                    className="shad-input"
                    {...field}
                  />
                </FormControl>
              </div>

              <FormMessage className="shad-form-message" />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="form-submit-button"
          disabled={isLoading}
        >
          {type === "sign-in" ? "サインイン" : "サインアップ"}
          {isLoading && (
            <Image
              src="/assets/icons/loader.svg"
              alt="loader"
              width={24}
              height={24}
              className="ml-2 animate-spin"
            />
          )}
        </Button>
        {errorMessage && <p className="error-message">*{errorMessage}</p>}

        <div className="body-2 flex justify-center">
          <p className="text-light-100">
            {type === "sign-in"
              ? "アカウントをお持ちでない場合は"
              : "アカウントをお持ちの場合は"}
          </p>
          <Link
            href={type === "sign-in" ? "/sign-up" : "/sign-in"}
            className="ml-1 font-medium text-brand"
          >
            {" "}
            {type === "sign-in" ? "サインアップ" : "サインイン"}
          </Link>
        </div>
      </form>
    </Form>
  );
};

export default AuthForm;
