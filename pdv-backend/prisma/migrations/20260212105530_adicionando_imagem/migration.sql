/*
  Warnings:

  - You are about to alter the column `valor` on the `contas_receber` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,2)`.
  - You are about to alter the column `quantidade` on the `itens_orcamento` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,3)`.
  - You are about to alter the column `precoUnit` on the `itens_orcamento` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,2)`.
  - You are about to alter the column `total` on the `orcamentos` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,2)`.
  - You are about to alter the column `valor` on the `pagamentos` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,2)`.
  - You are about to alter the column `total` on the `vendas` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,2)`.
  - You are about to drop the `Caixa` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MovimentacaoCaixa` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Produto` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "MovimentacaoCaixa" DROP CONSTRAINT "MovimentacaoCaixa_caixaId_fkey";

-- DropForeignKey
ALTER TABLE "itens_orcamento" DROP CONSTRAINT "itens_orcamento_produtoId_fkey";

-- DropForeignKey
ALTER TABLE "itens_venda" DROP CONSTRAINT "itens_venda_produto_id_fkey";

-- DropForeignKey
ALTER TABLE "vendas" DROP CONSTRAINT "vendas_caixaId_fkey";

-- AlterTable
ALTER TABLE "contas_receber" ALTER COLUMN "valor" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "itens_orcamento" ALTER COLUMN "quantidade" SET DATA TYPE DECIMAL(10,3),
ALTER COLUMN "precoUnit" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "orcamentos" ALTER COLUMN "total" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "pagamentos" ALTER COLUMN "valor" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "vendas" ADD COLUMN     "nota_cancelada" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "total" SET DATA TYPE DECIMAL(10,2);

-- DropTable
DROP TABLE "Caixa";

-- DropTable
DROP TABLE "MovimentacaoCaixa";

-- DropTable
DROP TABLE "Produto";

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produtos" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "codigoBarra" TEXT,
    "imagem" TEXT,
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

    CONSTRAINT "produtos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caixas" (
    "id" SERIAL NOT NULL,
    "dataAbertura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataFechamento" TIMESTAMP(3),
    "saldoInicial" DECIMAL(10,2) NOT NULL,
    "saldoAtual" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "saldoFinal" DECIMAL(10,2),
    "status" TEXT NOT NULL DEFAULT 'ABERTO',
    "observacoes" TEXT,

    CONSTRAINT "caixas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimentacoes_caixa" (
    "id" SERIAL NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "descricao" TEXT,
    "caixaId" INTEGER NOT NULL,

    CONSTRAINT "movimentacoes_caixa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "produtos_codigoBarra_key" ON "produtos"("codigoBarra");

-- AddForeignKey
ALTER TABLE "vendas" ADD CONSTRAINT "vendas_caixaId_fkey" FOREIGN KEY ("caixaId") REFERENCES "caixas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_venda" ADD CONSTRAINT "itens_venda_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_orcamento" ADD CONSTRAINT "itens_orcamento_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_caixa" ADD CONSTRAINT "movimentacoes_caixa_caixaId_fkey" FOREIGN KEY ("caixaId") REFERENCES "caixas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
