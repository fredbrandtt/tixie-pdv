import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dhbrqxrbzmupijzmheuj.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoYnJxeHJiem11cGlqem1oZXVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM4MjIxNDEsImV4cCI6MjA1OTM5ODE0MX0.8ZLgChPNi5HYZN5_Aazl9xnIft22chqCZW_HNDaXjF4'

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
})

async function createUserWithEmailPassword() {
  try {
    // Email do usuário a ser criado
    const email = 'daniellagolima@gmail.com'
    const password = 'picanhagorda'
    const nome = 'Daniel'
    const companyId = 3
    const isPromoter = true
    const isSuperAdmin = false
    
    console.log(`Tentando criar usuário com email: ${email}`)
    
    // Tentar fazer login direto (caso o usuário já exista)
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (!signInError) {
      console.log('Usuário já existe e foi possível fazer login:', signInData.user.id)
      
      // Verificar se já existe na tabela users
      const { data: userData, error: getUserError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single()
      
      if (getUserError) {
        console.log('Usuário existe na autenticação mas não na tabela users, adicionando...')
        
        // Inserir na tabela users
        const { error: insertUserError } = await supabase
          .from('users')
          .insert({
            id: signInData.user.id,
            email,
            nome,
            is_super_admin: isSuperAdmin,
            is_promoter: isPromoter,
            companyId
          })
        
        if (insertUserError) {
          throw insertUserError
        }
        
        console.log('Usuário adicionado à tabela users')
        
        // Verificar relação com empresa
        const { data: userEmpresa, error: getUserEmpresaError } = await supabase
          .from('user_empresas')
          .select('*')
          .eq('user_id', signInData.user.id)
          .single()
        
        if (getUserEmpresaError || !userEmpresa) {
          console.log('Adicionando relação com empresa...')
          
          // Inserir relação com empresa
          const { error: insertEmpresaError } = await supabase
            .from('user_empresas')
            .insert({
              user_id: signInData.user.id,
              empresa_id: companyId
            })
          
          if (insertEmpresaError) {
            throw insertEmpresaError
          }
          
          console.log('Relação com empresa criada')
        } else {
          console.log('Relação com empresa já existe')
        }
      } else {
        console.log('Usuário já existe na tabela users')
      }
      
      return { success: true, message: 'Usuário já existe e está configurado' }
    }
    
    // Criar um novo usuário sem enviar email de confirmação
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true // Define que o email já está confirmado
    })
    
    if (authError) {
      // Se o método admin não estiver disponível, tentar o signup normal
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: 'http://localhost:3000/'
        }
      })
      
      if (signUpError) {
        throw signUpError
      }
      
      if (!signUpData.user) {
        throw new Error('Erro ao criar usuário')
      }
      
      console.log('Usuário criado no Auth (verificação de email será necessária):', signUpData.user.id)
      console.log('Por favor verifique o email para confirmar a conta')
      
      // Inserir dados na tabela users
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: signUpData.user.id,
          email,
          nome,
          is_super_admin: isSuperAdmin,
          is_promoter: isPromoter,
          companyId
        })
      
      if (profileError) {
        throw profileError
      }
      
      // Inserir relação com empresa
      const { error: empresaError } = await supabase
        .from('user_empresas')
        .insert({
          user_id: signUpData.user.id,
          empresa_id: companyId
        })
      
      if (empresaError) {
        throw empresaError
      }
      
      return { 
        success: true, 
        message: 'Usuário criado com sucesso, mas precisa de verificação de email',
        user: signUpData.user
      }
    }
    
    console.log('Usuário criado no Auth (sem necessidade de verificação):', authData.user.id)
    
    // Inserir dados na tabela users
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
    
    // Inserir relação com empresa
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
    console.log('Usuário criado com sucesso!')
    
    return { 
      success: true, 
      message: 'Usuário criado com sucesso e já está confirmado',
      user: authData.user
    }
    
  } catch (error) {
    console.error('Erro ao criar usuário:', error)
    return { success: false, error }
  }
}

// Executar a função
createUserWithEmailPassword()
  .then((result) => {
    console.log('Resultado final:', result)
    console.log('Script finalizado')
  })
  .catch(err => console.error('Erro:', err)) 