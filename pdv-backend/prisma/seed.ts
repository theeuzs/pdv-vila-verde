import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs' // Importante para a senha funcionar

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Começando a plantação (Seed)...')

  // Criptografar a senha "123" para o banco aceitar
  const senhaCriptografada = await hash('123', 8)

  // 1. Criar Usuário Admin (Corrigido para usar username)
  const admin = await prisma.user.upsert({
    where: { username: 'admin' }, // Procura pelo username, não email
    update: {}, 
    create: {
      nome: 'Admin Vila Verde',
      username: 'admin',      // OBRIGATÓRIO AGORA
      senha: senhaCriptografada,
      cargo: 'GERENTE',
      email: 'admin@vilaverde.com'
    },
  })
  console.log(`👤 Usuário criado/verificado: ${admin.nome}`)

  // 2. Criar Produtos Destaque
  const produtos = [
    { nome: 'Cimento Votoran 50kg', precoCusto: 28.00, precoVenda: 35.90, estoque: 100, unidade: 'SC', categoria: 'Cimento', codigoBarra: '7890001' },
    { nome: 'Areia Média (Metro)', precoCusto: 80.00, precoVenda: 139.90, estoque: 10, unidade: 'M3', categoria: 'Areia', codigoBarra: 'AREIA01' },
    { nome: 'Cal Hidratada 20kg', precoCusto: 10.00, precoVenda: 15.90, estoque: 50, unidade: 'SC', categoria: 'Cal', codigoBarra: 'CAL01' },
    { nome: 'Argamassa AC1 Interna', precoCusto: 12.00, precoVenda: 18.90, estoque: 80, unidade: 'SC', categoria: 'Argamassa', codigoBarra: 'ARG01' },
    { nome: 'Pedra Brita 1 (Metro)', precoCusto: 90.00, precoVenda: 145.00, estoque: 15, unidade: 'M3', categoria: 'Pedra', codigoBarra: 'PEDRA01' },
    { nome: 'Tijolo Baiano (Milheiro)', precoCusto: 600.00, precoVenda: 850.00, estoque: 5, unidade: 'MIL', categoria: 'Tijolo', codigoBarra: 'TIJ01' },
    { nome: 'Coca-Cola 2L', precoCusto: 6.00, precoVenda: 9.00, estoque: 48, unidade: 'UN', categoria: 'Bebidas', codigoBarra: '7894900011517' },
  ]

  for (const p of produtos) {
    // Verifica se já existe produto com esse nome para não duplicar
    const existe = await prisma.produto.findFirst({ where: { nome: p.nome } })
    if (!existe) {
      await prisma.produto.create({ data: p })
    }
  }

  console.log('✅ Produtos cadastrados com sucesso!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })