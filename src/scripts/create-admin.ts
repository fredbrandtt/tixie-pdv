import { signUp } from '../services/auth'

async function createFirstAdmin() {
  try {
    const result = await signUp(
      'frederico@vcrma.com.br',
      '1234',
      'Frederico',
      1, // ID da primeira empresa
      true // super admin
    )
    
    console.log('Administrador criado com sucesso:', result)
  } catch (error) {
    console.error('Erro ao criar administrador:', error)
  }
}

createFirstAdmin() 