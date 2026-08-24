-- Proveedores internos sin cuenta de usuario (NextPlanning / NextMedia)
ALTER TABLE "ProviderProfile" DROP CONSTRAINT "ProviderProfile_userId_fkey";
ALTER TABLE "ProviderProfile" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "ProviderProfile" ADD CONSTRAINT "ProviderProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
