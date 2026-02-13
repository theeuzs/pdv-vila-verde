/*
  Warnings:

  - You are about to drop the `caixas` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `clientes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `contas_receber` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `itens_orcamento` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `itens_venda` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `movimentacoes_caixa` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `orcamentos` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `pagamentos` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `produtos` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `vendas` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "caixas" DROP CONSTRAINT "caixas_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "contas_receber" DROP CONSTRAINT "contas_receber_clienteId_fkey";

-- DropForeignKey
ALTER TABLE "contas_receber" DROP CONSTRAINT "contas_receber_vendaId_fkey";

-- DropForeignKey
ALTER TABLE "itens_orcamento" DROP CONSTRAINT "itens_orcamento_orcamentoId_fkey";

-- DropForeignKey
ALTER TABLE "itens_orcamento" DROP CONSTRAINT "itens_orcamento_produtoId_fkey";

-- DropForeignKey
ALTER TABLE "itens_venda" DROP CONSTRAINT "itens_venda_produto_id_fkey";

-- DropForeignKey
ALTER TABLE "itens_venda" DROP CONSTRAINT "itens_venda_venda_id_fkey";

-- DropForeignKey
ALTER TABLE "movimentacoes_caixa" DROP CONSTRAINT "movimentacoes_caixa_caixaId_fkey";

-- DropForeignKey
ALTER TABLE "orcamentos" DROP CONSTRAINT "orcamentos_clienteId_fkey";

-- DropForeignKey
ALTER TABLE "pagamentos" DROP CONSTRAINT "pagamentos_vendaId_fkey";

-- DropForeignKey
ALTER TABLE "vendas" DROP CONSTRAINT "vendas_caixaId_fkey";

-- DropForeignKey
ALTER TABLE "vendas" DROP CONSTRAINT "vendas_clienteId_fkey";

-- DropTable
DROP TABLE "caixas";

-- DropTable
DROP TABLE "clientes";

-- DropTable
DROP TABLE "contas_receber";

-- DropTable
DROP TABLE "itens_orcamento";

-- DropTable
DROP TABLE "itens_venda";

-- DropTable
DROP TABLE "movimentacoes_caixa";

-- DropTable
DROP TABLE "orcamentos";

-- DropTable
DROP TABLE "pagamentos";

-- DropTable
DROP TABLE "produtos";

-- DropTable
DROP TABLE "users";

-- DropTable
DROP TABLE "vendas";

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "senha" TEXT NOT NULL,
    "cargo" TEXT NOT NULL DEFAULT 'VENDEDOR',

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Caixa" (
    "id" SERIAL NOT NULL,
    "dataAbertura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataFechamento" TIMESTAMP(3),
    "saldoInicial" DOUBLE PRECISION NOT NULL,
    "saldoAtual" DOUBLE PRECISION NOT NULL,
    "saldoFinal" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'ABERTO',
    "observacoes" TEXT,
    "usuarioId" TEXT,

    CONSTRAINT "Caixa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimentacaoCaixa" (
    "id" SERIAL NOT NULL,
    "caixaId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "descricao" TEXT,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimentacaoCaixa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Produto" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "codigoBarra" TEXT,
    "precoVenda" DOUBLE PRECISION NOT NULL,
    "precoCusto" DOUBLE PRECISION,
    "estoque" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unidade" TEXT NOT NULL DEFAULT 'UN',
    "categoria" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Produto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "cpfCnpj" TEXT,
    "celular" TEXT,
    "endereco" TEXT,
    "endereco2" TEXT,
    "endereco3" TEXT,
    "saldoHaver" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venda" (
    "id" SERIAL NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total" DOUBLE PRECISION NOT NULL,
    "clienteId" INTEGER,
    "caixaId" INTEGER NOT NULL,
    "nota_emitida" BOOLEAN NOT NULL DEFAULT false,
    "nota_cancelada" BOOLEAN NOT NULL DEFAULT false,
    "urlFiscal" TEXT,
    "entrega" BOOLEAN NOT NULL DEFAULT false,
    "statusEntrega" TEXT,
    "enderecoEntrega" TEXT,

    CONSTRAINT "Venda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemVenda" (
    "id" SERIAL NOT NULL,
    "vendaId" INTEGER NOT NULL,
    "produtoId" INTEGER NOT NULL,
    "quantidade" DOUBLE PRECISION NOT NULL,
    "precoUnit" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ItemVenda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PagamentoVenda" (
    "id" SERIAL NOT NULL,
    "vendaId" INTEGER NOT NULL,
    "forma" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PagamentoVenda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Orcamento" (
    "id" SERIAL NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total" DOUBLE PRECISION NOT NULL,
    "clienteId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',

    CONSTRAINT "Orcamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemOrcamento" (
    "id" SERIAL NOT NULL,
    "orcamentoId" INTEGER NOT NULL,
    "produtoId" INTEGER NOT NULL,
    "quantidade" DOUBLE PRECISION NOT NULL,
    "precoUnit" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ItemOrcamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContaReceber" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "valorPago" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vencimento" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "descricao" TEXT,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataPagamento" TIMESTAMP(3),

    CONSTRAINT "ContaReceber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entrega" (
    "id" SERIAL NOT NULL,
    "vendaId" INTEGER NOT NULL,
    "clienteNome" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "telefone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataEntrega" TIMESTAMP(3),
    "observacoes" TEXT,

    CONSTRAINT "Entrega_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_username_key" ON "Usuario"("username");

-- CreateIndex
CREATE INDEX "Caixa_usuarioId_idx" ON "Caixa"("usuarioId");

-- CreateIndex
CREATE INDEX "Caixa_status_idx" ON "Caixa"("status");

-- CreateIndex
CREATE INDEX "MovimentacaoCaixa_caixaId_idx" ON "MovimentacaoCaixa"("caixaId");

-- CreateIndex
CREATE INDEX "Produto_codigoBarra_idx" ON "Produto"("codigoBarra");

-- CreateIndex
CREATE INDEX "Venda_caixaId_idx" ON "Venda"("caixaId");

-- CreateIndex
CREATE INDEX "Venda_clienteId_idx" ON "Venda"("clienteId");

-- CreateIndex
CREATE INDEX "Venda_data_idx" ON "Venda"("data");

-- CreateIndex
CREATE INDEX "ItemVenda_vendaId_idx" ON "ItemVenda"("vendaId");

-- CreateIndex
CREATE INDEX "PagamentoVenda_vendaId_idx" ON "PagamentoVenda"("vendaId");

-- CreateIndex
CREATE INDEX "Orcamento_clienteId_idx" ON "Orcamento"("clienteId");

-- CreateIndex
CREATE INDEX "ItemOrcamento_orcamentoId_idx" ON "ItemOrcamento"("orcamentoId");

-- CreateIndex
CREATE INDEX "ContaReceber_clienteId_idx" ON "ContaReceber"("clienteId");

-- CreateIndex
CREATE INDEX "ContaReceber_status_idx" ON "ContaReceber"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Entrega_vendaId_key" ON "Entrega"("vendaId");

-- CreateIndex
CREATE INDEX "Entrega_status_idx" ON "Entrega"("status");

-- AddForeignKey
ALTER TABLE "Caixa" ADD CONSTRAINT "Caixa_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoCaixa" ADD CONSTRAINT "MovimentacaoCaixa_caixaId_fkey" FOREIGN KEY ("caixaId") REFERENCES "Caixa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venda" ADD CONSTRAINT "Venda_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venda" ADD CONSTRAINT "Venda_caixaId_fkey" FOREIGN KEY ("caixaId") REFERENCES "Caixa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemVenda" ADD CONSTRAINT "ItemVenda_vendaId_fkey" FOREIGN KEY ("vendaId") REFERENCES "Venda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemVenda" ADD CONSTRAINT "ItemVenda_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagamentoVenda" ADD CONSTRAINT "PagamentoVenda_vendaId_fkey" FOREIGN KEY ("vendaId") REFERENCES "Venda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orcamento" ADD CONSTRAINT "Orcamento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemOrcamento" ADD CONSTRAINT "ItemOrcamento_orcamentoId_fkey" FOREIGN KEY ("orcamentoId") REFERENCES "Orcamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemOrcamento" ADD CONSTRAINT "ItemOrcamento_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContaReceber" ADD CONSTRAINT "ContaReceber_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
