import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando a plantação no banco de dados...')

  // 1. Limpa o banco (pra não dar erro de duplicado)
  await prisma.itemVenda.deleteMany()
  await prisma.venda.deleteMany()
  await prisma.produto.deleteMany()
  await prisma.cliente.deleteMany()
  await prisma.user.deleteMany()

  // 2. Cria o ADMIN
  const senhaForte = await hash('123456', 8)
  await prisma.user.create({
    data: {
      nome: 'Matheus',
      email: 'mahenriquemh@gmail.com',
      senha: senhaForte,
      cargo: 'GERENTE' // Importante para poder cancelar nota!
    }
  })
  console.log('👤 Usuário Admin criado! (Login: admin@vilaverde.com / 123456)')

  // 3. Cria um CLIENTE
  await prisma.cliente.create({
    data: {
      nome: 'Matheus Henrique',
      cpfCnpj: '124.430.959-16', // CPF Fictício
      celular: '41996272846',
      endereco: 'Rua João Malucelli Neto, 616'
    }
  })
  console.log('👥 Cliente teste criado!')

  // 4. Cria PRODUTOS (Com dados fiscais para NFC-e funcionar)
  const produtos = [
    {
      nome: 'Cimento Votoran 50kg',
      precoCusto: 28.00,
      precoVenda: 35.00,
      estoque: 100,
      unidade: 'SC',
      ncm: '25232910', // NCM Real de Cimento
      cfop: '5102',
      csosn: '102', // Simples Nacional
      categoria: 'Básico'
    },
    {
      nome: 'Tijolo 6 Furos (Milheiro)',
      precoCusto: 600.00,
      precoVenda: 850.00,
      estoque: 10, // 10 milheiros
      unidade: 'MIL',
      ncm: '69041000',
      cfop: '5102',
      csosn: '102',
      categoria: 'Básico'
    },
    {
      nome: 'Coca-Cola 2L', // Clássica para teste rápido
      precoCusto: 5.00,
      precoVenda: 9.00,
      estoque: 48,
      unidade: 'UN',
      ncm: '22021000', 
      cfop: '5405', // Subst. Tributária (Teste de imposto)
      csosn: '500',
      categoria: 'Bebidas'
    },
    {
      nome: 'Areia Média (Metro)',
      precoCusto: 80.00,
      precoVenda: 120.00,
      estoque: 15,
      unidade: 'M3',
      ncm: '25051000',
      cfop: '5102',
      csosn: '102',
      categoria: 'Básico'
    },
    {
      nome: 'Luva de Latex P',
      precoCusto: 2.00,
      precoVenda: 5.50,
      estoque: 50,
      unidade: 'PAR',
      ncm: '40151900',
      cfop: '5102',
      csosn: '102',
      categoria: 'EPI'
    }
  ]

  for (const p of produtos) {
    await prisma.produto.create({ data: p })
  }

  console.log(`📦 ${produtos.length} produtos adicionados ao estoque!`)
  console.log('✅ BANCO DE DADOS PRONTO PARA O COMBATE! 🚀')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })