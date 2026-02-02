import { PrismaClient } from '@prisma/client'
import XLSX from 'xlsx'
import * as fs from 'fs'

const prisma = new PrismaClient()

async function importarProdutos() {
  console.log("📂 Lendo o arquivo produtos.xlsx ...")

  try {
    const arquivo = XLSX.readFile('produtos.xlsx')
    const planilha = arquivo.Sheets[arquivo.SheetNames[0]]
    
    // Lê todas as linhas
    const linhas: any[] = XLSX.utils.sheet_to_json(planilha, { header: 1 }) 

    console.log(`📊 Encontrei ${linhas.length} linhas. Começando a importar...`)

    let importados = 0
    let erros = 0

    // Começamos o loop a partir da linha 4 (onde começam os dados reais na sua foto)
    for (let i = 4; i < linhas.length; i++) {
      const linha = linhas[i]

      // --- MAPEAMENTO DAS COLUNAS (Baseado na sua foto "Lista de Preços") ---
      // Coluna A [0] -> Código
      // Coluna C [2] -> Nome do Produto
      // Coluna I [8] -> Estoque (Ajustado!)
      // Coluna K [10]-> Preço de Venda (Ajustado!)
      
      const codigo = linha[0] ? String(linha[0]) : '' 
      const nome = linha[2] ? String(linha[2]).trim() : ''
      const estoqueRaw = linha[8] // Coluna I
      const precoRaw = linha[10]  // Coluna K

      // Pula se não tiver nome ou preço
      if (!nome || !precoRaw) continue 

      // TRATAMENTO DE PREÇO
      let precoFinal = 0
      if (typeof precoRaw === 'number') {
        precoFinal = precoRaw
      } else if (typeof precoRaw === 'string') {
        const limpo = precoRaw.replace('R$', '').replace(/\s/g, '').replace('.', '').replace(',', '.')
        precoFinal = parseFloat(limpo) || 0
      }

      // TRATAMENTO DE ESTOQUE
      let estoqueFinal = 0
      if (typeof estoqueRaw === 'number') {
        estoqueFinal = estoqueRaw
      } else if (typeof estoqueRaw === 'string') {
        const limpo = estoqueRaw.replace('.', '').replace(',', '.')
        estoqueFinal = parseFloat(limpo) || 0
      }

      // Salva no Banco
      try {
        await prisma.produto.create({
          data: {
            nome: nome,
            codigoBarra: codigo,
            precoCusto: 0, 
            precoVenda: precoFinal,
            estoque: estoqueFinal,
            unidade: 'UN',
            categoria: 'Geral'
          }
        })
        importados++
        if (importados % 100 === 0) process.stdout.write(`.` ) 
      } catch (error) {
        erros++
      }
    }

    console.log(`\n\n✅ FINALIZADO!`)
    console.log(`📦 Produtos Importados: ${importados}`)
    console.log(`⚠️ Pulos (Repetidos/Vazios): ${erros}`)

  } catch (e) {
    console.error("❌ Erro ao ler o arquivo.", e)
  }
}

importarProdutos()