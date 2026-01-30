-- AlterTable
ALTER TABLE "vendas" ADD COLUMN     "clienteId" INTEGER,
ALTER COLUMN "total" SET DATA TYPE DECIMAL(65,30);

-- AddForeignKey
ALTER TABLE "vendas" ADD CONSTRAINT "vendas_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
