/*
  Warnings:

  - You are about to alter the column `saldoHaver` on the `clientes` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,2)`.
  - You are about to drop the `produtos` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[cpfCnpj]` on the table `clientes` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `dataVencimento` to the `contas_receber` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "itens_orcamento" DROP CONSTRAINT "itens_orcamento_produtoId_fkey";

-- DropForeignKey
ALTER TABLE "itens_venda" DROP CONSTRAINT "itens_venda_produto_id_fkey";

-- AlterTable
ALTER TABLE "clientes" ADD COLUMN     "bairro" TEXT,
ADD COLUMN     "cep" TEXT,
ADD COLUMN     "cidade" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "estado" TEXT,
ADD COLUMN     "numero" TEXT,
ADD COLUMN     "rua" TEXT,
ADD COLUMN     "saldoDevedor" DECIMAL(10,2) NOT NULL DEFAULT 0,
ALTER COLUMN "saldoHaver" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "contas_receber" ADD COLUMN     "dataVencimento" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "descricao" TEXT;

-- AlterTable
ALTER TABLE "vendas" ADD COLUMN     "enderecoEntrega" TEXT,
ADD COLUMN     "entrega" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "statusEntrega" TEXT DEFAULT 'PENDENTE';

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
    "csosn" TEXT NOT NULL DEFAULT '102',
    "origem" TEXT NOT NULL DEFAULT '0',

    CONSTRAINT "Produto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Caixa" (
    "id" SERIAL NOT NULL,
    "dataAbertura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataFechamento" TIMESTAMP(3),
    "saldoInicial" DECIMAL(10,2) NOT NULL,
    "saldoAtual" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "saldoFinal" DECIMAL(10,2),
    "status" TEXT NOT NULL DEFAULT 'ABERTO',
    "observacoes" TEXT,

    CONSTRAINT "Caixa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimentacaoCaixa" (
    "id" SERIAL NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "descricao" TEXT,
    "caixaId" INTEGER NOT NULL,

    CONSTRAINT "MovimentacaoCaixa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Produto_codigoBarra_key" ON "Produto"("codigoBarra");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_cpfCnpj_key" ON "clientes"("cpfCnpj");

-- AddForeignKey
ALTER TABLE "itens_venda" ADD CONSTRAINT "itens_venda_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_orcamento" ADD CONSTRAINT "itens_orcamento_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoCaixa" ADD CONSTRAINT "MovimentacaoCaixa_caixaId_fkey" FOREIGN KEY ("caixaId") REFERENCES "Caixa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
