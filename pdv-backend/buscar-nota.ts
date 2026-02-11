// Arquivo: buscar-nota.ts
import 'dotenv/config'; // Garante que lê o .env

async function buscarNotas() {
  console.log("🔍 Buscando notas emitidas...");

  // 1. Autenticação
  const credenciais = new URLSearchParams();
  credenciais.append('client_id', process.env.NUVEM_CLIENT_ID!);
  credenciais.append('client_secret', process.env.NUVEM_CLIENT_SECRET!);
  credenciais.append('grant_type', 'client_credentials');
  credenciais.append('scope', 'nfce');

  const authResponse = await fetch('https://auth.nuvemfiscal.com.br/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: credenciais
  });
  const authData = await authResponse.json();
  const token = authData.access_token;

  // 2. Lista as últimas 10 notas NFC-e
const url = `https://api.sandbox.nuvemfiscal.com.br/nfce?top=50&orderby=created_at desc`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const dados = await response.json();

  if (dados.data && dados.data.length > 0) {
    console.log("\n📄 === NOTAS ENCONTRADAS === 📄");
    dados.data.forEach((nota: any) => {
      console.log(`\n📅 Data: ${nota.created_at}`);
      console.log(`🔢 Número: ${nota.numero}`);
      console.log(`✅ Status: ${nota.status}`);
      console.log(`🔗 PDF (DANFE): ${nota.url_danfe || nota.link_danfe || "Link não gerado"}`);
      console.log("-----------------------------------");
    });
  } else {
    console.log("❌ Nenhuma nota encontrada nesta conta.");
  }
}

buscarNotas();