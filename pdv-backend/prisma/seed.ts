import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import * as path from 'path'
import * as fs from 'fs'

import _XLSX from 'xlsx'
const XLSX = _XLSX as any 

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Começando o Seed (Com NCM)...')

  // 1. ADMIN
  const senhaCriptografada = await hash('123', 8)
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {}, 
    create: {
      nome: 'Admin Vila Verde',
      username: 'admin',
      senha: senhaCriptografada,
      cargo: 'GERENTE',
      email: 'admin@vilaverde.com'
    },
  })

  // 2. IMPORTAR EXCEL
  let caminhoArquivo = path.resolve('produtos.xlsx')
  if (!fs.existsSync(caminhoArquivo)) {
      caminhoArquivo = path.resolve('prisma', 'produtos.xlsx')
  }

  console.log(`📂 Lendo arquivo: ${caminhoArquivo}`)

  if (fs.existsSync(caminhoArquivo)) {
    const workbook = XLSX.readFile(caminhoArquivo)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    
    // Leitura por colunas (Matriz)
    const linhas: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 })

    console.log(`📦 Processando ${linhas.length} linhas...`)

    // Remove cabeçalho se necessário
    const dadosParaImportar = linhas.filter((linha, index) => {
        if (index === 0 && isNaN(Number(linha[5]))) return false; 
        return true;
    });

    const produtosFormatados = dadosParaImportar.map((coluna: any) => {
      
      const lerNumero = (val: any) => {
        if (!val) return 0;
        if (typeof val === 'number') return val;

        let str = String(val).replace('R$', '').trim();
        
        if (str.includes(',') && str.includes('.')) {
            str = str.replace(/\./g, '').replace(',', '.');
        } else if (str.includes(',')) {
            str = str.replace(',', '.');
        }
        return Number(str);
      }

      // MAPEAMENTO FINAL:
      // A[0]=Cod | B[1]=Nome | C[2]=Un | D[3]=Estoque | E[4]=Custo | F[5]=Venda | G[6]=NCM
      
      let codigo = String(coluna[0] || '').trim();
      let nome = String(coluna[1] || 'Produto Sem Nome').trim();
      let unidade = String(coluna[2] || 'UN').toUpperCase().trim();
      let estoque = Number(coluna[3] || 0);
      let custo = lerNumero(coluna[4]);
      let venda = lerNumero(coluna[5]);
      
      // 👇 AQUI ESTÁ O NCM (Coluna G)
      // Removemos pontos se vier formatado (ex: 25.23.10 -> 252310)
      let ncm = String(coluna[6] || '').replace(/\./g, '').trim(); 

      // Proteção contra números gigantes no preço
      if (venda > 1000000) venda = 0; 

      return {
        nome:        nome, 
        codigoBarra: codigo, 
        precoCusto:  custo,
        precoVenda:  venda,
        ncm:         ncm, // Salva o NCM
        estoque:     estoque,
        unidade:     unidade,
        categoria:   'Geral',
        ativo:       true
      }
    })

    console.log('💾 Salvando no banco...')
    
    const validos = produtosFormatados.filter(p => p.nome !== 'Produto Sem Nome' && (p.precoVenda > 0 || p.estoque > 0));

    await prisma.produto.createMany({
      data: validos,
      skipDuplicates: true 
    })
    console.log(`✅ Sucesso! ${validos.length} produtos importados.`)

  } else {
    console.error('❌ ARQUIVO NÃO ENCONTRADO!')
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })