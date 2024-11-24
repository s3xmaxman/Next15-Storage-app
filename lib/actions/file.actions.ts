/**
 * ファイル操作に関連するサーバーサイドアクション
 * @module file.actions
 */

"use server";

import { createAdminClient, createSessionClient } from "@/lib/appwrite";
import { InputFile } from "node-appwrite/file";
import { appwriteConfig } from "@/lib/appwrite/config";
import { ID, Models, Query } from "node-appwrite";
import { constructFileUrl, getFileType, parseStringify } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/actions/user.actions";

/**
 * エラーハンドリング用のユーティリティ関数
 * @param error - エラーオブジェクト
 * @param message - エラーメッセージ
 */
const handleError = (error: unknown, message: string) => {
  console.log(error, message);
  throw error;
};

/**
 * ファイルをアップロードし、データベースに登録する
 * @param file - アップロードするファイル
 * @param ownerId - ファイルの所有者ID
 * @param accountId - アカウントID
 * @param path - リダイレクト用のパス
 */
export const uploadFile = async ({
  file,
  ownerId,
  accountId,
  path,
}: UploadFileProps) => {
  const { storage, databases } = await createAdminClient();

  try {
    // ファイルをバッファに変換
    const inputFile = InputFile.fromBuffer(file, file.name);

    // ストレージにファイルを保存
    const bucketFile = await storage.createFile(
      appwriteConfig.bucketId,
      ID.unique(),
      inputFile
    );

    // データベースに保存するファイル情報を作成
    const fileDocument = {
      type: getFileType(bucketFile.name).type,
      name: bucketFile.name,
      url: constructFileUrl(bucketFile.$id),
      extension: getFileType(bucketFile.name).extension,
      size: bucketFile.sizeOriginal,
      owner: ownerId,
      accountId,
      users: [],
      bucketFileId: bucketFile.$id,
    };

    // データベースにファイル情報を保存
    const newFile = await databases
      .createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.filesCollectionId,
        ID.unique(),
        fileDocument
      )
      .catch(async (error: unknown) => {
        // ファイル保存に失敗した場合、ストレージからファイルを削除
        await storage.deleteFile(appwriteConfig.bucketId, bucketFile.$id);
        handleError(error, "Failed to upload file");
      });

    // キャッシュを更新
    revalidatePath(path);
    return parseStringify(newFile);
  } catch (error) {
    handleError(error, "Failed to upload file");
  }
};

/**
 * ファイルを取得するためのクエリを生成する
 * @param currentUser - 現在のユーザー情報
 * @param types - ファイルタイプ
 * @param searchText - 検索文字列
 * @param sort - ソート条件
 * @param limit - 取得件数
 */
const createQueries = (
  currentUser: Models.Document,
  types: string[],
  searchText: string,
  sort: string,
  limit?: number
) => {
  const queries = [
    // ファイル所有者または共有ユーザーに絞り込む
    Query.or([
      Query.equal("owner", [currentUser.$id]),
      Query.contains("users", [currentUser.email]),
    ]),
  ];

  // ファイルタイプで絞り込む
  if (types.length > 0) {
    queries.push(Query.equal("type", types));
  }

  // 検索文字列で絞り込む
  if (searchText) {
    queries.push(Query.contains("name", searchText));
  }

  // 件数を制限する
  if (limit) {
    queries.push(Query.limit(limit));
  }

  // ソート条件を設定する
  if (sort) {
    const [sortBy, orderBy] = sort.split("-");

    queries.push(
      orderBy === "asc" ? Query.orderAsc(sortBy) : Query.orderDesc(sortBy)
    );
  }

  return queries;
};

/**
 * ファイルを取得する
 * @param types - ファイルタイプ
 * @param searchText - 検索文字列
 * @param sort - ソート条件
 * @param limit - 取得件数
 */
export const getFiles = async ({
  types = [],
  searchText = "",
  sort = "$createdAt-desc",
  limit,
}: GetFilesProps) => {
  const { databases } = await createAdminClient();

  try {
    // 現在のユーザー情報を取得
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      throw new Error("User not found");
    }

    // クエリを生成
    const queries = createQueries(currentUser, types, searchText, sort, limit);

    // ファイルを取得
    const files = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      queries
    );

    return parseStringify(files);
  } catch (error) {
    handleError(error, "Failed to get files");
  }
};

/**
 * ファイル名を変更する
 * @param fileId - ファイルID
 * @param name - 新しいファイル名
 * @param extension - ファイル拡張子
 * @param path - リダイレクト用のパス
 */
export const renameFile = async ({
  fileId,
  name,
  extension,
  path,
}: RenameFileProps) => {
  const { databases } = await createAdminClient();

  try {
    // 新しいファイル名を生成
    const newName = `${name}.${extension}`;

    // ファイル名を更新
    const updatedFile = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      fileId,
      { name: newName }
    );

    // キャッシュを更新
    revalidatePath(path);
    return parseStringify(updatedFile);
  } catch (error) {
    handleError(error, "Failed to rename file");
  }
};

/**
 * ファイルの共有ユーザーを更新する
 * @param fileId - ファイルID
 * @param emails - 共有ユーザーのメールアドレス
 * @param path - リダイレクト用のパス
 */
export const updateFileUsers = async ({
  fileId,
  emails,
  path,
}: UpdateFileUsersProps) => {
  const { databases } = await createAdminClient();

  try {
    // 共有ユーザーを更新
    const updatedFile = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      fileId,
      { users: emails }
    );

    // キャッシュを更新
    revalidatePath(path);
    return parseStringify(updatedFile);
  } catch (error) {
    handleError(error, "Failed to update file users");
  }
};

/**
 * ファイルを削除する
 * @param fileId - ファイルID
 * @param bucketFileId - ストレージファイルID
 * @param path - リダイレクト用のパス
 */
export const deleteFile = async ({
  fileId,
  bucketFileId,
  path,
}: DeleteFileProps) => {
  const { storage, databases } = await createAdminClient();

  try {
    // ファイルを削除
    const deletedFile = await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      fileId
    );

    // ストレージからファイルを削除
    await storage.deleteFile(appwriteConfig.bucketId, bucketFileId);

    // キャッシュを更新
    revalidatePath(path);
    return parseStringify(deletedFile);
  } catch (error) {
    handleError(error, "Failed to delete file");
  }
};

/**
 * ユーザーの合計使用容量を計算する
 * @returns {Promise<number>} 合計使用容量（バイト）
 * @throws {Error} ユーザー情報の取得に失敗した場合
 */
export const getTotalSpaceUsed = async () => {
  try {
    // ユーザー情報を取得
    const { databases } = await createSessionClient();
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("User is not authenticated.");

    // ファイル情報を取得
    const files = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      [Query.equal("owner", [currentUser.$id])]
    );

    // 合計使用容量を計算
    const totalSpace = {
      image: { size: 0, latestDate: "" },
      document: { size: 0, latestDate: "" },
      video: { size: 0, latestDate: "" },
      audio: { size: 0, latestDate: "" },
      other: { size: 0, latestDate: "" },
      used: 0,
      all: 2 * 1024 * 1024 * 1024,
    };

    files.documents.forEach((file) => {
      const fileType = file.type as FileType;
      totalSpace[fileType].size += file.size;
      totalSpace.used += file.size;

      if (
        !totalSpace[fileType].latestDate ||
        new Date(file.$updatedAt) > new Date(totalSpace[fileType].latestDate)
      ) {
        totalSpace[fileType].latestDate = file.$updatedAt;
      }
    });

    return parseStringify(totalSpace);
  } catch (error) {
    handleError(error, "Error calculating total space used:, ");
  }
};
