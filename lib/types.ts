export type CoaRecord = {
  id: string;
  storeId: string;
  fileName: string;
  blobUrl: string;
  fileSize: number;
  uploadedAt: string;
};

export type StoreRecord = {
  id: string;
  slug: string;
  name: string;
  createdAt: string;
};

export type StoreUserRecord = {
  id: string;
  storeId: string;
  email: string;
  passwordHash: string;
  createdAt: string;
};

export type SessionRole = "platform" | "store";
