-- AlterTable
ALTER TABLE "vendas" ADD COLUMN     "formaPagamento" TEXT NOT NULL DEFAULT 'DINHEIRO';

-- CreateTable
CREATE TABLE "contas_receber" (
    "id" SERIAL NOT NULL,
    "valor" DECIMAL(65,30) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clienteId" INTEGER NOT NULL,
    "vendaId" INTEGER NOT NULL,

    CONSTRAINT "contas_receber_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contas_receber_vendaId_key" ON "contas_receber"("vendaId");

-- AddForeignKey
ALTER TABLE "contas_receber" ADD CONSTRAINT "contas_receber_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_receber" ADD CONSTRAINT "contas_receber_vendaId_fkey" FOREIGN KEY ("vendaId") REFERENCES "vendas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
