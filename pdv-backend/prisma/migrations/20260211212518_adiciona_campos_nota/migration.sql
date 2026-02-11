-- AlterTable
ALTER TABLE "vendas" ADD COLUMN     "caixaId" INTEGER,
ADD COLUMN     "nota_chave" TEXT,
ADD COLUMN     "nota_emitida" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nota_id_nuvem" TEXT,
ADD COLUMN     "nota_numero" INTEGER,
ADD COLUMN     "nota_url_pdf" TEXT,
ADD COLUMN     "pagamento" TEXT,
ADD COLUMN     "urlFiscal" TEXT;

-- AddForeignKey
ALTER TABLE "vendas" ADD CONSTRAINT "vendas_caixaId_fkey" FOREIGN KEY ("caixaId") REFERENCES "Caixa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
