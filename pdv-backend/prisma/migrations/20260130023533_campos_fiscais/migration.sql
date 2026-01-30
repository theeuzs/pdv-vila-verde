/*
  Warnings:

  - You are about to drop the `produtos` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "itens_venda" DROP CONSTRAINT "itens_venda_produto_id_fkey";

-- DropTable
DROP TABLE "produtos";

-- CreateTable
CREATE TABLE "Produto" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "codigoBarra" TEXT,
    "precoCusto" DOUBLE PRECISION NOT NULL,
    "precoVenda" DOUBLE PRECISION NOT NULL,
    "estoque" INTEGER NOT NULL,
    "unidade" TEXT,
    "categoria" TEXT,
    "fornecedor" TEXT,
    "localizacao" TEXT,
    "ipi" DOUBLE PRECISION DEFAULT 0,
    "icms" DOUBLE PRECISION DEFAULT 0,
    "frete" DOUBLE PRECISION DEFAULT 0,
    "ncm" TEXT,
    "cest" TEXT,
    "cfop" TEXT,

    CONSTRAINT "Produto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Produto_codigoBarra_key" ON "Produto"("codigoBarra");

-- AddForeignKey
ALTER TABLE "itens_venda" ADD CONSTRAINT "itens_venda_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
