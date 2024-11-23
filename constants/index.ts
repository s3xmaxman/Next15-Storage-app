export const navItems = [
  {
    name: "ダッシュボード",
    icon: "/assets/icons/dashboard.svg",
    url: "/",
  },
  {
    name: "ドキュメント",
    icon: "/assets/icons/documents.svg",
    url: "/documents",
  },
  {
    name: "画像",
    icon: "/assets/icons/images.svg",
    url: "/images",
  },
  {
    name: "メディア",
    icon: "/assets/icons/video.svg",
    url: "/media",
  },
  {
    name: "その他",
    icon: "/assets/icons/others.svg",
    url: "/others",
  },
];

export const actionsDropdownItems = [
  {
    label: "名前変更",
    icon: "/assets/icons/edit.svg",
    value: "rename",
  },
  {
    label: "詳細",
    icon: "/assets/icons/info.svg",
    value: "details",
  },
  {
    label: "共有",
    icon: "/assets/icons/share.svg",
    value: "share",
  },
  {
    label: "ダウンロード",
    icon: "/assets/icons/download.svg",
    value: "download",
  },
  {
    label: "削除",
    icon: "/assets/icons/delete.svg",
    value: "delete",
  },
];

export const sortTypes = [
  {
    label: "作成日時（新しい順）",
    value: "$createdAt-desc",
  },
  {
    label: "作成日時（古い順）",
    value: "$createdAt-asc",
  },
  {
    label: "名前（A-Z）",
    value: "name-asc",
  },
  {
    label: "名前（Z-A）",
    value: "name-desc",
  },
  {
    label: "サイズ（大きい順）",
    value: "size-desc",
  },
  {
    label: "サイズ（小さい順）",
    value: "size-asc",
  },
];

export const avatarPlaceholderUrl =
  "https://img.freepik.com/free-psd/3d-illustration-person-with-sunglasses_23-2149436188.jpg";

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
