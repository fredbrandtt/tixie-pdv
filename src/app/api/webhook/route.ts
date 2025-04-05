export async function POST(req: Request) {
  console.log('Recebido webhook, processando...');
  
  try {
    const requestData = await req.json();
    console.log('Dados do webhook recebidos:', JSON.stringify(requestData));
    
    // Usar o valor do companyId recebido na requisição
    console.log('companyId sendo usado:', requestData.companyId);
    
    // Validar dados obrigatórios
    if (!requestData.companyId) {
      console.error('Erro: companyId não foi fornecido');
      return new Response('Erro: ID da empresa não fornecido', { status: 400 });
    }

    // Enviar para API externa
    const apiUrl = 'https://pdvapi.tixie.com.br/api/v1/webhooks/ingresso';
    
    console.log('Enviando dados para:', apiUrl);
    console.log('Dados enviados:', JSON.stringify(requestData));
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro da API externa:', response.status, errorText);
      return new Response(`Erro da API externa: ${response.status} ${errorText}`, { status: response.status });
    }
    
    const responseData = await response.json();
    console.log('Resposta da API externa:', JSON.stringify(responseData));
    
    return new Response(JSON.stringify(responseData), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Erro ao processar o webhook:', error);
    return new Response('Erro ao processar o webhook', { status: 500 });
  }
} 