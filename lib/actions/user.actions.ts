/**
 * ユーザー関連の操作を行うモジュール
 * @module UserActions
 */

"use server";

import { createAdminClient, createSessionClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { Query, ID } from "node-appwrite";
import { parseStringify } from "@/lib/utils";
import { cookies } from "next/headers";
import { avatarPlaceholderUrl } from "@/constants";
import { redirect } from "next/navigation";

/**
 * メールアドレスからユーザーを取得する
 * @param {string} email - ユーザーのメールアドレス
 * @returns {Promise<Object|null>} ユーザーオブジェクトまたはnull
 */
const getUserByEmail = async (email: string) => {
  const { databases } = await createAdminClient();

  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.usersCollectionId,
    [Query.equal("email", [email])]
  );

  return result.total > 0 ? result.documents[0] : null;
};

/**
 * エラーハンドリング関数
 * @param {unknown} error - エラーオブジェクト
 * @param {string} message - エラーメッセージ
 * @throws {unknown} 受け取ったエラーをスロー
 */
const handleError = (error: unknown, message: string) => {
  console.log(error, message);
  throw error;
};

/**
 * メールでOTPを送信する
 * @param {Object} params - パラメータオブジェクト
 * @param {string} params.email - ユーザーのメールアドレス
 * @returns {Promise<string|undefined>} セッションのユーザーID
 */
export const sendEmailOTP = async ({ email }: { email: string }) => {
  const { account } = await createAdminClient();

  try {
    const session = await account.createEmailToken(ID.unique(), email);
    return session.userId;
  } catch (error) {
    handleError(error, "Failed to send email OTP");
  }
};

/**
 * 新規アカウントを作成する
 * @param {Object} params - パラメータオブジェクト
 * @param {string} params.fullName - ユーザーのフルネーム
 * @param {string} params.email - ユーザーのメールアドレス
 * @returns {Promise<Object>} アカウントIDを含むオブジェクト
 */
export const createAccount = async ({
  fullName,
  email,
}: {
  fullName: string;
  email: string;
}) => {
  const existingUser = await getUserByEmail(email);

  const accountId = await sendEmailOTP({ email });
  if (!accountId) throw new Error("Failed to send an OTP");

  if (!existingUser) {
    const { databases } = await createAdminClient();

    // 新規ユーザーをデータベースに作成
    await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      ID.unique(),
      {
        fullName,
        email,
        avatar: avatarPlaceholderUrl,
        accountId,
      }
    );
  }

  return parseStringify({ accountId });
};

/**
 * OTPを検証してセッションを作成する
 * @param {Object} params - パラメータオブジェクト
 * @param {string} params.accountId - アカウントID
 * @param {string} params.password - OTPパスワード
 * @returns {Promise<Object|undefined>} セッションIDを含むオブジェクト
 */
export const verifySecret = async ({
  accountId,
  password,
}: {
  accountId: string;
  password: string;
}) => {
  try {
    const { account } = await createAdminClient();

    const session = await account.createSession(accountId, password);

    // セッションクッキーを設定
    (await cookies()).set("appwrite-session", session.secret, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: true,
    });

    return parseStringify({ sessionId: session.$id });
  } catch (error) {
    handleError(error, "Failed to verify OTP");
  }
};

/**
 * 現在のユーザー情報を取得する
 * @returns {Promise<Object|null|undefined>} ユーザーオブジェクトまたはnull
 */
export const getCurrentUser = async () => {
  try {
    const { databases, account } = await createSessionClient();

    const result = await account.get();

    const user = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      [Query.equal("accountId", result.$id)]
    );

    if (user.total <= 0) {
      return null;
    }

    return parseStringify(user.documents[0]);
  } catch (error) {
    handleError(error, "Failed to get current user");
  }
};

/**
 * ユーザーをサインアウトする
 * @returns {Promise<void>}
 */
export const signOutUser = async () => {
  try {
    const { account } = await createSessionClient();

    await account.deleteSession("current");
    (await cookies()).delete("appwrite-session");
  } catch (error) {
    handleError(error, "Failed to sign out");
  } finally {
    redirect("/sign-in");
  }
};

/**
 * ユーザーをサインインする
 * @param {Object} params - パラメータオブジェクト
 * @param {string} params.email - ユーザーのメールアドレス
 * @returns {Promise<Object|undefined>} アカウントIDまたはエラー情報を含むオブジェクト
 */
export const signInUser = async ({ email }: { email: string }) => {
  try {
    const existingUser = await getUserByEmail(email);

    if (existingUser) {
      await sendEmailOTP({ email });
      return parseStringify({ accountId: existingUser.accountId });
    }

    return parseStringify({ accountId: null, error: "User not found" });
  } catch (error) {
    handleError(error, "Failed to sign in");
  }
};
