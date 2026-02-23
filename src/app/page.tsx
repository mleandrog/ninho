"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ShoppingBag, Heart, ArrowRight, Star, Sparkles, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { useCart } from "@/hooks/useCart";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

export default function Home() {
  const { addItem } = useCart();
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedProducts();
  }, []);

  const fetchFeaturedProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_featured", true)
        .eq("available_in_store", true) // Apenas produtos disponíveis na loja
        .limit(4);

      if (error) throw error;
      setFeaturedProducts(data || []);
    } catch (error) {
      console.error("Erro ao carregar produtos em destaque:", error);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { name: "Conjuntos", slug: "conjuntos", icon: "👕", color: "bg-[#4ECDC4]" },
    { name: "Vestidos", slug: "vestidos", icon: "👗", color: "bg-[#FF6B6B]" },
    { name: "Calçados", slug: "calcados", icon: "👟", color: "bg-[#FFD93D]" },
    { name: "Acessórios", slug: "acessorios", icon: "🎀", color: "bg-[#FF9F1C]" },
    { name: "Bebês", slug: "bebes", icon: "🍼", color: "bg-[#A8E6CF]" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-white overflow-x-hidden selection:bg-primary selection:text-white">
      <Header />

      <main className="flex-1">
        {/* Top Promo Bar */}
        <div className="bg-primary py-2.5 text-center text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-white overflow-hidden whitespace-nowrap">
          <div className="inline-block animate-pulse">
            ✨ Frete Grátis em compras acima de R$ 300,00 • Use o cupom: <span className="bg-white text-primary px-2 py-0.5 rounded ml-1">BEMVINDO</span> ✨
          </div>
        </div>

        {/* Hero Section - Khelna Style */}
        <section className="relative pt-16 pb-24 lg:pt-32 lg:pb-48 overflow-hidden bg-accent">
          {/* Animated Background Ornaments */}
          <div className="absolute top-20 left-[10%] w-64 h-64 hero-blob animate-float" style={{ animationDelay: '0s' }} />
          <div className="absolute bottom-40 right-[15%] w-96 h-96 hero-blob animate-float" style={{ animationDelay: '1s', opacity: 0.15 }} />

          {/* Cloud Decorations */}
          <div className="absolute top-10 left-10 text-7xl opacity-40 blur-[2px] animate-float lg:block hidden">☁️</div>
          <div className="absolute top-40 right-20 text-5xl opacity-40 blur-[1px] animate-bounce lg:block hidden">☁️</div>
          <div className="absolute top-[60%] left-1/4 text-6xl opacity-30 animate-pulse lg:block hidden">☁️</div>

          <div className="container mx-auto px-6 grid lg:grid-cols-2 gap-20 items-center relative z-10">
            <motion.div
              initial={{ opacity: 0, x: -60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="space-y-10"
            >
              <div className="space-y-4">
                <span className="inline-flex items-center gap-2 bg-white/40 backdrop-blur-sm px-6 py-2 rounded-full text-sm font-black uppercase tracking-widest text-primary border border-white/50">
                  <Sparkles size={16} /> Coleção Primavera 2026
                </span>
                <h1 className="text-7xl lg:text-[10rem] font-black text-white leading-[0.8] tracking-tighter drop-shadow-2xl">
                  VIVA <br />
                  A <span className="text-primary italic">FESTA!</span>
                </h1>
              </div>

              <p className="text-2xl text-accent-foreground/80 max-w-xl font-bold leading-relaxed">
                Roupas que contam histórias e transformam cada brincadeira
                em um momento mágico. Conforto premium para seu ninho.
              </p>

              <div className="flex flex-wrap gap-6 pt-4">
                <Button size="lg" className="h-24 px-16 text-2xl rounded-full shadow-accent bg-white text-primary hover:bg-primary hover:text-white transition-all transform hover:-rotate-3 active:scale-95 flex items-center gap-4 group">
                  EXPLORAR <ShoppingBag size={32} className="group-hover:rotate-12 transition-transform" />
                </Button>
                <Link href="/catalogo">
                  <Button variant="ghost" size="lg" className="h-24 px-12 text-2xl font-black text-white hover:text-primary-foreground group">
                    CATÁLOGO <ArrowRight className="group-hover:translate-x-4 transition-transform size-8" />
                  </Button>
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 1, type: "spring" }}
              className="relative lg:justify-self-end"
            >
              {/* Organic Frame */}
              <div className="relative group">
                <div className="absolute -inset-12 bg-white rounded-[30% 70% 70% 30% / 30% 30% 70% 70%] animate-pulse opacity-20 blur-2xl group-hover:opacity-40 transition-opacity" />
                <div className="relative z-10 bg-white rounded-[5rem] p-5 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] rotate-3 border-[12px] border-white overflow-hidden max-w-2xl">
                  <div className="aspect-[4/5] bg-soft rounded-[4rem] overflow-hidden flex items-center justify-center relative">
                    {/* Placeholder for real image */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent" />
                    <span className="text-[12rem] animate-float drop-shadow-xl relative z-20">🐥</span>

                    {/* Decorative Star */}
                    <Star size={40} className="absolute top-10 right-10 text-accent fill-accent animate-spin-slow" />
                  </div>
                </div>

                {/* Highlight Floating Elements */}
                <div className="absolute -bottom-10 -left-10 bg-secondary text-white p-8 rounded-[3rem] shadow-premium flex flex-col items-center rotate-[-12deg] animate-float" style={{ animationDelay: '0.5s' }}>
                  <span className="text-4xl font-black">100%</span>
                  <span className="text-sm font-bold uppercase tracking-widest text-center leading-none mt-1">Algodão<br />Orgânico</span>
                </div>

                <div className="absolute -top-12 -right-8 bg-primary text-white py-4 px-8 rounded-full shadow-vibrant flex items-center gap-3 rotate-12">
                  <div className="flex gap-1 text-accent">
                    {[1, 2, 3, 4, 5].map(i => <Star key={i} size={14} fill="currentColor" />)}
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest">+5k Mamães</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Section Divider (Wave) */}
          <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-[0] transform rotate-180">
            <svg className="relative block w-[calc(100%+1.3px)] h-[80px]" viewBox="0 0 1200 120" preserveAspectRatio="none">
              <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C58,111,123,103,181,89c51.21-12.39,101.5-30.2,140.39-32.56Z" fill="#FFFFFF"></path>
            </svg>
          </div>
        </section>

        {/* Categories Section - Khelna Circular Grid */}
        <section className="py-32 relative">
          <div className="container mx-auto px-6">
            <div className="flex flex-col items-center gap-4 mb-20 text-center">
              <span className="text-primary font-black uppercase tracking-[0.3em] text-sm">Navegue por Mundo</span>
              <h2 className="text-5xl lg:text-7xl font-black text-muted-text">Explore nosso Ninho</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-12 lg:gap-16">
              {categories.map((cat, idx) => (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  key={cat.slug}
                  className="flex flex-col items-center group cursor-pointer"
                >
                  <Link href={`/catalogo?categoria=${cat.slug}`} className="w-full">
                    <div className={`category-circle ${cat.color} text-7xl lg:text-8xl relative overflow-hidden`}>
                      <span className="z-10 group-hover:scale-125 transition-transform duration-500">{cat.icon}</span>
                      <div className="absolute inset-0 bg-white/20 scale-0 group-hover:scale-100 transition-transform duration-700 rounded-full" />
                    </div>
                  </Link>
                  <div className="mt-8 text-center">
                    <span className="block text-2xl font-black text-muted-text group-hover:text-primary transition-colors">{cat.name}</span>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1 block">Ver Coleção</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Products - Netic/Premium Style */}
        <section className="py-32 bg-soft/50 relative">
          {/* Subtle Decorative Blobs */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/20 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />

          <div className="container mx-auto px-6 relative z-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
              <div className="space-y-4">
                <h2 className="text-5xl lg:text-6xl font-black text-muted-text leading-tight">Escolhas da Semana</h2>
                <p className="text-xl text-gray-500 font-bold max-w-xl">
                  As peças mais amadas pela nossa comunidade. Qualidade que você sente,
                  estilo que eles amam.
                </p>
              </div>
              <Link href="/catalogo">
                <Button variant="outline" className="rounded-full h-16 px-10 text-xl font-black hover:bg-primary hover:text-white group border-gray-200">
                  VER TUDO <ChevronRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
              {featuredProducts.map((product, idx) => (
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  key={product.id}
                  className="premium-card group h-full flex flex-col"
                >
                  {/* Image Area */}
                  <div className="relative aspect-[4/5] overflow-hidden rounded-[2.5rem] m-3 mb-0 bg-soft">
                    <Link href={`/produtos/${product.id}`} className="block h-full w-full">
                      <div className="absolute inset-0 flex items-center justify-center text-[7rem] group-hover:scale-110 transition-transform duration-700 z-10">
                        {product.id === 1 ? "🧸" : product.id === 2 ? "🌸" : product.id === 3 ? "👟" : "☁️"}
                      </div>
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity z-10" />
                    </Link>

                    {/* Quick Actions */}
                    <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
                      <button className="w-12 h-12 bg-white/90 backdrop-blur-md rounded-2xl flex items-center justify-center text-muted-text hover:bg-primary hover:text-white transition-all shadow-lg transform translate-x-8 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 duration-300">
                        <Heart size={20} />
                      </button>
                    </div>

                    {/* Tag */}
                    <div className={`absolute top-4 left-4 z-20 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-white shadow-lg ${product.tag === 'Novo' ? 'bg-secondary' : product.tag === 'Oferta' ? 'bg-primary' : 'bg-accent text-accent-foreground'
                      }`}>
                      {product.tag}
                    </div>
                  </div>

                  {/* Content Area */}
                  <div className="p-8 space-y-4 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-400">
                        <span>{product.category}</span>
                        <div className="flex gap-0.5 text-accent">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} size={12} fill={i < product.rating ? "currentColor" : "none"} className={i < product.rating ? "text-accent" : "text-gray-200"} />
                          ))}
                        </div>
                      </div>
                      <Link href={`/produtos/${product.id}`}>
                        <h3 className="text-2xl font-black text-muted-text leading-tight hover:text-primary transition-colors">
                          {product.name}
                        </h3>
                      </Link>
                    </div>

                    <div className="flex items-center justify-between pt-4 gap-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-400 line-through">R$ {(product.price * 1.2).toFixed(2).replace('.', ',')}</span>
                        <span className="text-3xl font-black text-muted-text tracking-tighter">
                          R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <Button
                        className="w-16 h-16 p-0 rounded-3xl shadow-vibrant shrink-0 group/btn"
                        onClick={() => addItem(product)}
                      >
                        <ShoppingBag size={28} className="group-hover/btn:rotate-12 transition-transform" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Newsletter - Playful & Modern */}
        <section className="py-40 bg-white relative overflow-hidden">
          {/* Animated Background blobs */}
          <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-accent opacity-20 blur-[100px] rounded-full" />
          <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-primary opacity-20 blur-[100px] rounded-full" />

          <div className="container mx-auto px-6 relative z-10">
            <div className="max-w-4xl mx-auto bg-soft rounded-[4rem] p-12 lg:p-24 text-center space-y-12 border-8 border-white shadow-premium relative">
              {/* Decorative floaters */}
              <div className="absolute -top-12 -left-12 text-7xl animate-float">🧸</div>
              <div className="absolute -bottom-12 -right-12 text-7xl animate-float" style={{ animationDelay: '1s' }}>🎨</div>

              <div className="space-y-4">
                <h2 className="text-5xl lg:text-7xl font-black text-muted-text tracking-tight">Vem pro nosso ninho!</h2>
                <p className="text-2xl text-gray-500 font-bold">
                  Receba cupons exclusivos, novidades <br className="hidden lg:block" />
                  e dicas lúdicas no seu e-mail.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto bg-white p-3 rounded-[3rem] shadow-premium">
                <input
                  type="email"
                  placeholder="Seu melhor e-mail..."
                  className="flex-1 px-8 py-5 rounded-[2rem] border-none text-xl font-bold focus:ring-0 placeholder:text-gray-300"
                />
                <Button className="rounded-[2rem] px-12 h-20 shadow-vibrant text-xl font-black uppercase tracking-widest bg-primary text-white">
                  PARTICIPAR
                </Button>
              </div>
              <p className="text-sm font-bold text-gray-300 uppercase tracking-widest">
                🛡️ Prometemos não encher seu ninho de spam.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#1A1A1A] py-24 text-white rounded-t-[5rem]">
        <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-20">
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-primary rounded-[2rem] flex items-center justify-center text-white font-black text-3xl shadow-vibrant rotate-[-5deg]">
                N
              </div>
              <span className="text-4xl font-black tracking-tighter">Ninho<span className="text-primary">Lar</span></span>
            </div>
            <p className="text-lg font-bold text-gray-400 leading-relaxed">
              Vestindo a infância com cores, conforto e a <br />
              liberdade que cada criança merece para brilhar.
            </p>
            <div className="flex gap-5">
              {['📸', '💬', '🐦', '✉️'].map((ico, i) => (
                <div key={i} className="w-14 h-14 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center text-3xl transition-all cursor-pointer border border-white/5 active:scale-90">
                  {ico}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h5 className="font-black text-2xl mb-10 flex items-center gap-2">Mundo Ninho <div className="h-1 w-10 bg-primary rounded-full" /></h5>
            <ul className="space-y-6 font-bold text-xl text-gray-400">
              <li><Link href="/catalogo" className="hover:text-primary transition-colors">Coleção 2026</Link></li>
              <li><Link href="/promocoes" className="hover:text-secondary transition-colors">Ofertas Mágicas</Link></li>
              <li><Link href="/blog" className="hover:text-accent transition-colors">Dicas de Ninho</Link></li>
              <li><Link href="/quem-somos" className="hover:text-primary transition-colors">Nossa História</Link></li>
            </ul>
          </div>

          <div>
            <h5 className="font-black text-2xl mb-10 flex items-center gap-2">Cuidado <div className="h-1 w-10 bg-secondary rounded-full" /></h5>
            <ul className="space-y-6 font-bold text-xl text-gray-400">
              <li><Link href="/trocas" className="hover:text-secondary transition-colors">Trocas Gratuitas</Link></li>
              <li><Link href="/frete" className="hover:text-secondary transition-colors">Envio Seguro</Link></li>
              <li><Link href="/faq" className="hover:text-secondary transition-colors">Dúvidas Frequentes</Link></li>
              <li><Link href="/rastreio" className="hover:text-secondary transition-colors">Rastrear Pedido</Link></li>
            </ul>
          </div>

          <div className="space-y-10">
            <h5 className="font-black text-2xl mb-1 flex items-center gap-2">Vem Conversar <div className="h-1 w-10 bg-accent rounded-full" /></h5>
            <div className="space-y-2">
              <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">WhatsApp Central</p>
              <p className="text-3xl font-black text-white">(11) 99999-9999</p>
            </div>
            <div className="space-y-2">
              <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">E-mail de Suporte</p>
              <p className="text-xl font-bold text-primary italic">ola@ninholar.com.br</p>
            </div>

            {/* Payment Icons Placeholder */}
            <div className="pt-4 flex flex-wrap gap-4 opacity-30 grayscale hover:grayscale-0 transition-all duration-700">
              <div className="h-10 w-16 bg-white/20 rounded-lg" />
              <div className="h-10 w-16 bg-white/20 rounded-lg" />
              <div className="h-10 w-16 bg-white/20 rounded-lg" />
            </div>
          </div>
        </div>

        <div className="container mx-auto px-6 mt-24 pt-12 border-t border-white/5 text-center">
          <p className="text-gray-500 font-bold tracking-widest text-sm">
            © 2026 NINHO LAR • TODA CRIANÇA É UM MUNDO NOVO • <span className="text-primary">FEITO COM AMOR</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
