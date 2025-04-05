import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dhbrqxrbzmupijzmheuj.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoYnJxeHJiem11cGlqem1oZXVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM4MjIxNDEsImV4cCI6MjA1OTM5ODE0MX0.8ZLgChPNi5HYZN5_Aazl9xnIft22chqCZW_HNDaXjF4'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function createPromoter() {
  try {
    // Defina as informações do usuário
    const email = 'daniellagolima@gmail.com'
    const password = 'picanhagorda'
    const nome = 'Daniel'
    const companyId = 3
    const isPromoter = true
    const isSuperAdmin = false

    console.log('Iniciando criação do usuário promotor:', email)

    // 1. Criar o usuário no Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) {
      throw authError
    }

    if (!authData.user) {
      throw new Error('Erro ao criar usuário')
    }

    console.log('Usuário criado no Auth:', authData.user.id)

    // 2. Inserir dados na tabela users
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        nome,
        is_super_admin: isSuperAdmin,
        is_promoter: isPromoter,
        companyId
      })

    if (profileError) {
      throw profileError
    }

    console.log('Dados inseridos na tabela users')

    // 3. Inserir relação com empresa
    const { error: empresaError } = await supabase
      .from('user_empresas')
      .insert({
        user_id: authData.user.id,
        empresa_id: companyId
      })

    if (empresaError) {
      throw empresaError
    }

    console.log('Relação com empresa criada')
    console.log('Promotor criado com sucesso!')

  } catch (error) {
    console.error('Erro ao criar promotor:', error)
  }
}

// Executar a função
createPromoter()
  .then(() => console.log('Script finalizado'))
  .catch(err => console.error('Erro:', err)) 