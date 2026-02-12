import { PrismaClient } from '@prisma/client'
import * as XLSX_LIB from 'xlsx' // Importa tudo
import path from 'path'
import fs from 'fs' // Vamos usar o leitor nativo do Windows

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Preparando robô...')

  // 1. Correção da Biblioteca (O Pulo do Gato para Node 24)
  // Se o XLSX vier "escondido", a gente pega ele à força
  const XLSX = (XLSX_LIB as any).default || XLSX_LIB

  console.log('📂 Procurando arquivo produtos.xlsx...')
  
  // 2. Caminho do arquivo (sem __dirname)
  const caminhoArquivo = path.resolve('produtos.xlsx')

  // 3. Lê o arquivo na força bruta (Buffer)
  if (!fs.existsSync(caminhoArquivo)) {
    console.error(`❌ ERRO: Não achei o arquivo em: ${caminhoArquivo}`)
    console.error('Certifique-se que o nome é "produtos.xlsx" e está na pasta pdv-backend')
    return
  }

  const arquivoBuffer = fs.readFileSync(caminhoArquivo)
  const workbook = XLSX.read(arquivoBuffer, { type: 'buffer' }) // Lê direto da memória
  
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const dados = XLSX.utils.sheet_to_json(sheet) as any[]

  console.log(`📄 Lendo planilha... Encontrei ${dados.length} linhas. Importando agora!`)

  let salvos = 0
  
  for (const item of dados) {
    try {
      const nome = String(item['PRODUTO'] || 'Sem Nome')
      const codigo = String(item['CÓDIGO'] || Math.floor(Math.random() * 1000000)) 
      
      const custo = limparDinheiro(item['PREÇO CUSTO'])
      const venda = limparDinheiro(item['PREÇO VENDA'])
      const estoque = Number(item['ESTOQUE'] || 0)
      const unidade = String(item['MEDIDA'] || 'UN')
      const ncm = String(item['NCM'] || '')

      await prisma.produto.create({
        data: {
          nome,
          codigoBarra: codigo,
          precoCusto: custo,
          precoVenda: venda,
          estoque: estoque,
          unidade: unidade,
          ncm: ncm,
          categoria: 'Geral',
          cfop: '5102',
          origem: '0'
        }
      })

      salvos++
      if (salvos % 100 === 0) process.stdout.write('.') 

    } catch (error) {
      // Ignora erro
    }
  }

  console.log(`\n\n✅ SUCESSO ABSOLUTO! ${salvos} produtos importados.`)
}

function limparDinheiro(valor: any) {
  if (!valor) return 0
  if (typeof valor === 'number') return valor
  const limpo = String(valor).replace('R$', '').replace(/\s/g, '').replace(',', '.')
  return parseFloat(limpo) || 0
}

main()
  .catch(e => console.error('\n❌ Erro fatal:', e))
  .finally(async () => await prisma.$disconnect())