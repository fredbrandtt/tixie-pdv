import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dhbrqxrbzmupijzmheuj.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoYnJxeHJiem11cGlqem1oZXVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM4MjIxNDEsImV4cCI6MjA1OTM5ODE0MX0.8ZLgChPNi5HYZN5_Aazl9xnIft22chqCZW_HNDaXjF4'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function confirmUserEmail() {
  try {
    // Email do usuário a ser confirmado
    const email = 'danii_harumi@hotmail.com'
    
    console.log(`Tentando confirmar email para: ${email}`)
    
    // Opção 1: Enviar um novo email de confirmação
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    })
    
    if (resendError) {
      console.error('Erro ao reenviar email de confirmação:', resendError)
    } else {
      console.log('Email de confirmação reenviado com sucesso!')
      console.log('Por favor, verifique a caixa de entrada e spam para completar a confirmação.')
    }
    
    // Opção 2: Criar uma função de administrador para definir um usuário como confirmado
    // Isso normalmente exigiria acesso de administrador ao banco de dados do Supabase
    // ou uma função de serviço do lado do servidor.
    console.log('Nota: Para confirmar manualmente sem email, você precisará:')
    console.log('1. Acessar o painel de administração do Supabase')
    console.log('2. Ir para Authentication > Users')
    console.log('3. Encontrar o usuário e marcá-lo como confirmado')
    
  } catch (error) {
    console.error('Erro ao confirmar email:', error)
  }
}

// Executar a função
confirmUserEmail()
  .then(() => console.log('Script finalizado'))
  .catch(err => console.error('Erro:', err)) 