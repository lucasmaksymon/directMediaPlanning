import { createUploadthing, type FileRouter } from "uploadthing/next";
import { auth } from "@/auth";

const f = createUploadthing();

export const ourFileRouter = {
  inventoryImage: f({ image: { maxFileSize: "8MB", maxFileCount: 6 } })
    .middleware(async () => {
      const session = await auth();
      if (!session?.user || (session.user.role !== "admin")) {
        throw new Error("Solo los medios pueden subir imágenes.");
      }
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { url: file.ufsUrl };
    }),
  erpDocument: f({
    pdf: { maxFileSize: "16MB", maxFileCount: 1 },
    image: { maxFileSize: "8MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      const session = await auth();
      if (!session?.user || session.user.role !== "admin") {
        throw new Error("Solo administración puede adjuntar comprobantes.");
      }
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
