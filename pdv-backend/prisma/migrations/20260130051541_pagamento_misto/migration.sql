/*
  Warnings:

  - You are about to drop the column `formaPagamento` on the `vendas` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "vendas" DROP COLUMN "formaPagamento";

-- CreateTable
CREATE TABLE "pagamentos" (
    "id" SERIAL NOT NULL,
    "valor" DECIMAL(65,30) NOT NULL,
    "forma" TEXT NOT NULL,
    "vendaId" INTEGER NOT NULL,

    CONSTRAINT "pagamentos_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_vendaId_fkey" FOREIGN KEY ("vendaId") REFERENCES "vendas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
