import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://dhbrqxrbzmupijzmheuj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoYnJxeHJiem11cGlqem1oZXVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM4MjIxNDEsImV4cCI6MjA1OTM5ODE0MX0.8ZLgChPNi5HYZN5_Aazl9xnIft22chqCZW_HNDaXjF4'
)

async function testLogin() {
  try {
    console.log('Tentando fazer login...')
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'frederico@vcrma.com.br',
      password: '1234'
    })

    if (error) {
      console.error('Erro ao fazer login:', error)
      return
    }

    console.log('Login bem sucedido:', data)
  } catch (error) {
    console.error('Erro inesperado:', error)
  }
}

testLogin() 