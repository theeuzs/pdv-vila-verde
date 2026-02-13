-- AlterTable
ALTER TABLE "caixas" ADD COLUMN     "usuarioId" TEXT;

-- AddForeignKey
ALTER TABLE "caixas" ADD CONSTRAINT "caixas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
