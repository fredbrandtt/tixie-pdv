"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { signIn } from "@/services/auth";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Verifica sessão existente ao carregar
  useEffect(() => {
    const checkSession = async () => {
      try {
        setCheckingSession(true);
        
        // Limpar qualquer companyId existente
        localStorage.removeItem("userCompanyId");
        
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Erro ao verificar sessão:", error);
          setCheckingSession(false);
          return;
        }
        
        if (data.session) {
          // Verifica se o usuário tem um companyId associado
          const { data: userData } = await supabase.auth.getUser();
          
          if (userData?.user) {
            // Buscar o companyId diretamente da tabela users
            const { data: userInfo, error: userError } = await supabase
              .from('users')
              .select('companyId')
              .eq('id', userData.user.id)
              .single();
              
            if (userError) {
              console.error("Erro ao verificar companyId do usuário:", userError);
              setCheckingSession(false);
              return;
            }
            
            if (userInfo && userInfo.companyId !== undefined) {
              // Salvar o companyId no localStorage
              localStorage.setItem("userCompanyId", userInfo.companyId.toString());
              console.log("Sessão: companyId obtido e salvo no localStorage:", userInfo.companyId);
              
              // Redirecionar para PDV
              console.log("Sessão existente encontrada, redirecionando para PDV");
              router.push("/pdv");
            } else {
              console.log("Usuário sem companyId definido");
              toast.error("Usuário sem empresa associada");
              await supabase.auth.signOut();
              setCheckingSession(false);
            }
          } else {
            setCheckingSession(false);
          }
        } else {
          setCheckingSession(false);
        }
      } catch (err) {
        console.error("Erro ao verificar sessão:", err);
        setCheckingSession(false);
      }
    };
    
    checkSession();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    setError("");
    
    try {
      // Limpar o localStorage de qualquer companyId anterior
      localStorage.removeItem("userCompanyId");
      
      const data = await signIn(email, password);
      
      if (!data || !data.session) {
        throw new Error("Falha ao obter sessão");
      }
      
      // Verificar se o usuário está associado a uma empresa
      const { data: userData } = await supabase.auth.getUser();
          
      if (userData?.user) {
        // Buscar o companyId diretamente da tabela users
        const { data: userInfo, error: userError } = await supabase
          .from('users')
          .select('companyId')
          .eq('id', userData.user.id)
          .single();
          
        if (userError) {
          console.error("Erro ao verificar companyId do usuário:", userError);
          throw new Error("Erro ao verificar companyId do usuário");
        }
        
        if (userInfo && userInfo.companyId !== undefined) {
          // Salvar o companyId no localStorage
          const companyId = userInfo.companyId;
          localStorage.setItem("userCompanyId", companyId.toString());
          console.log("Login: companyId salvo no localStorage:", companyId);
          
          // Mostrar mensagem de sucesso
          toast.success("Login realizado com sucesso!");
          
          // Redirecionar para a página inicial
          router.push('/pdv');
        } else {
          throw new Error("Usuário sem companyId definido");
        }
      } else {
        throw new Error("Dados do usuário não encontrados");
      }
    } catch (err) {
      console.error('Erro no login:', err);
      setError(err instanceof Error ? err.message : 'Erro inesperado no login');
      toast.error(`Erro no login: ${err instanceof Error ? err.message : 'Erro inesperado'}`);
      
      // Limpar qualquer sessão que possa ter sido criada
      await supabase.auth.signOut();
    } finally {
      setLoading(false);
    }
  };

  // Renderizar tela de carregamento enquanto verifica a sessão
  if (checkingSession) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-900 to-black"
        style={{
          backgroundImage: "url('/images/bg.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-blue-900/20" />
        <div className="backdrop-blur-xl bg-black/30 border border-white/10 rounded-lg p-8 shadow-2xl relative z-10">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-white">Verificando sessão...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-900 to-black"
      style={{
        backgroundImage: "url('/images/bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Overlay com gradiente */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-blue-900/20" />
      
      {/* Efeito de brilho */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-blue-500/10 animate-pulse" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl relative"
      >
        <Card className="backdrop-blur-xl bg-black/30 border border-white/10 shadow-2xl">
          <CardHeader className="pb-8 pt-8">
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 mx-auto shadow-lg shadow-purple-500/20" />
              <div>
                <h1 className="text-4xl font-bold text-center text-white">
                  PDV Armazém
                </h1>
                <p className="text-center text-gray-300 mt-2 text-lg">
                  Sistema de vendas de ingressos
                </p>
              </div>
            </motion.div>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-8 px-8">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-md flex items-start gap-2 text-red-400">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm">{error}</p>
                  </div>
                </div>
              )}
              
              <div className="space-y-4">
                <Label htmlFor="email" className="text-lg text-gray-200">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  required
                  className="h-14 text-lg px-4 bg-white/10 border-white/20 text-white placeholder:text-gray-400 backdrop-blur-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-4">
                <Label htmlFor="password" className="text-lg text-gray-200">
                  Senha
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  className="h-14 text-lg px-4 bg-white/10 border-white/20 text-white placeholder:text-gray-400 backdrop-blur-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter className="px-8 pb-8 pt-4">
              <Button
                type="submit"
                className="w-full h-14 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white transition-all duration-300 shadow-xl shadow-purple-500/20 border border-white/10 backdrop-blur-sm"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                    <span>Entrando...</span>
                  </div>
                ) : (
                  "Entrar"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </div>
  );
} 