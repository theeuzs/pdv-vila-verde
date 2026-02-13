/*
  Warnings:

  - You are about to drop the `Caixa` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Cliente` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ContaReceber` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Entrega` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ItemOrcamento` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ItemVenda` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MovimentacaoCaixa` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Orcamento` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PagamentoVenda` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Produto` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Usuario` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Venda` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Caixa" DROP CONSTRAINT "Caixa_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "ContaReceber" DROP CONSTRAINT "ContaReceber_clienteId_fkey";

-- DropForeignKey
ALTER TABLE "ItemOrcamento" DROP CONSTRAINT "ItemOrcamento_orcamentoId_fkey";

-- DropForeignKey
ALTER TABLE "ItemOrcamento" DROP CONSTRAINT "ItemOrcamento_produtoId_fkey";

-- DropForeignKey
ALTER TABLE "ItemVenda" DROP CONSTRAINT "ItemVenda_produtoId_fkey";

-- DropForeignKey
ALTER TABLE "ItemVenda" DROP CONSTRAINT "ItemVenda_vendaId_fkey";

-- DropForeignKey
ALTER TABLE "MovimentacaoCaixa" DROP CONSTRAINT "MovimentacaoCaixa_caixaId_fkey";

-- DropForeignKey
ALTER TABLE "Orcamento" DROP CONSTRAINT "Orcamento_clienteId_fkey";

-- DropForeignKey
ALTER TABLE "PagamentoVenda" DROP CONSTRAINT "PagamentoVenda_vendaId_fkey";

-- DropForeignKey
ALTER TABLE "Venda" DROP CONSTRAINT "Venda_caixaId_fkey";

-- DropForeignKey
ALTER TABLE "Venda" DROP CONSTRAINT "Venda_clienteId_fkey";

-- DropTable
DROP TABLE "Caixa";

-- DropTable
DROP TABLE "Cliente";

-- DropTable
DROP TABLE "ContaReceber";

-- DropTable
DROP TABLE "Entrega";

-- DropTable
DROP TABLE "ItemOrcamento";

-- DropTable
DROP TABLE "ItemVenda";

-- DropTable
DROP TABLE "MovimentacaoCaixa";

-- DropTable
DROP TABLE "Orcamento";

-- DropTable
DROP TABLE "PagamentoVenda";

-- DropTable
DROP TABLE "Produto";

-- DropTable
DROP TABLE "Usuario";

-- DropTable
DROP TABLE "Venda";

-- CreateTable
CREATE TABLE "vendas" (
    "id" SERIAL NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total" DECIMAL(10,2) NOT NULL,
    "entrega" BOOLEAN NOT NULL DEFAULT false,
    "pagamento" TEXT,
    "urlFiscal" TEXT,
    "statusEntrega" TEXT DEFAULT 'PENDENTE',
    "enderecoEntrega" TEXT,
    "nota_emitida" BOOLEAN NOT NULL DEFAULT false,
    "nota_id_nuvem" TEXT,
    "nota_chave" TEXT,
    "nota_numero" INTEGER,
    "nota_url_pdf" TEXT,
    "nota_cancelada" BOOLEAN NOT NULL DEFAULT false,
    "clienteId" INTEGER,
    "caixaId" INTEGER,

    CONSTRAINT "vendas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_venda" (
    "id" SERIAL NOT NULL,
    "quantidade" DECIMAL(10,3) NOT NULL,
    "preco_unitario" DECIMAL(10,2) NOT NULL,
    "venda_id" INTEGER NOT NULL,
    "produto_id" INTEGER NOT NULL,

    CONSTRAINT "itens_venda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagamentos" (
    "id" SERIAL NOT NULL,
    "forma" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "vendaId" INTEGER NOT NULL,

    CONSTRAINT "pagamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produtos" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "codigo_barra" TEXT,
    "preco_venda" DECIMAL(10,2) NOT NULL,
    "preco_custo" DECIMAL(10,2),
    "estoque" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "unidade" TEXT NOT NULL DEFAULT 'UN',
    "categoria" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "produtos_pkey" PRIMARY KEY ("id")
);

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
CREATE TABLE "clientes" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf_cnpj" TEXT,
    "celular" TEXT,
    "endereco" TEXT,
    "endereco2" TEXT,
    "endereco3" TEXT,
    "saldo_haver" DECIMAL(10,2) NOT NULL DEFAULT 0,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orcamentos" (
    "id" SERIAL NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "clienteId" INTEGER,

    CONSTRAINT "orcamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_orcamento" (
    "id" SERIAL NOT NULL,
    "quantidade" DECIMAL(10,3) NOT NULL,
    "preco_unitario" DECIMAL(10,2) NOT NULL,
    "orcamento_id" INTEGER NOT NULL,
    "produto_id" INTEGER NOT NULL,

    CONSTRAINT "itens_orcamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contas_receber" (
    "id" SERIAL NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "valor_pago" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "vencimento" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "descricao" TEXT,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_pagamento" TIMESTAMP(3),
    "clienteId" INTEGER NOT NULL,
    "venda_id" INTEGER,

    CONSTRAINT "contas_receber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entregas" (
    "id" SERIAL NOT NULL,
    "venda_id" INTEGER NOT NULL,
    "cliente_nome" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "telefone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_entrega" TIMESTAMP(3),
    "observacoes" TEXT,

    CONSTRAINT "entregas_pkey" PRIMARY KEY ("id")
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
    "usuario_id" TEXT,

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
CREATE UNIQUE INDEX "contas_receber_venda_id_key" ON "contas_receber"("venda_id");

-- CreateIndex
CREATE UNIQUE INDEX "entregas_venda_id_key" ON "entregas"("venda_id");

-- CreateIndex
CREATE INDEX "caixas_usuario_id_idx" ON "caixas"("usuario_id");

-- CreateIndex
CREATE INDEX "caixas_status_idx" ON "caixas"("status");

-- AddForeignKey
ALTER TABLE "vendas" ADD CONSTRAINT "vendas_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendas" ADD CONSTRAINT "vendas_caixaId_fkey" FOREIGN KEY ("caixaId") REFERENCES "caixas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_venda" ADD CONSTRAINT "itens_venda_venda_id_fkey" FOREIGN KEY ("venda_id") REFERENCES "vendas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_venda" ADD CONSTRAINT "itens_venda_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_vendaId_fkey" FOREIGN KEY ("vendaId") REFERENCES "vendas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orcamentos" ADD CONSTRAINT "orcamentos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_orcamento" ADD CONSTRAINT "itens_orcamento_orcamento_id_fkey" FOREIGN KEY ("orcamento_id") REFERENCES "orcamentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_orcamento" ADD CONSTRAINT "itens_orcamento_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_receber" ADD CONSTRAINT "contas_receber_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_receber" ADD CONSTRAINT "contas_receber_venda_id_fkey" FOREIGN KEY ("venda_id") REFERENCES "vendas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caixas" ADD CONSTRAINT "caixas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_caixa" ADD CONSTRAINT "movimentacoes_caixa_caixaId_fkey" FOREIGN KEY ("caixaId") REFERENCES "caixas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
