import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Utensils, Zap, BarChart3, Smartphone, ArrowRight } from "lucide-react";

const features = [
  { icon: Smartphone, title: "Cardápio Digital", desc: "Seu cardápio online, bonito e profissional." },
  { icon: Zap, title: "Pedidos em Tempo Real", desc: "Receba e gerencie pedidos instantaneamente." },
  { icon: BarChart3, title: "Frete Inteligente", desc: "Cálculo automático por distância." },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <Utensils className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold text-foreground">EPRATO</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/login">Entrar</Link>
            </Button>
            <Button variant="hero" asChild>
              <Link to="/signup">Criar Conta</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-24 md:py-32">
        <div className="container text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-6 animate-fade-in">
            <Zap className="w-4 h-4" />
            Cardápio digital profissional
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-foreground leading-tight mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            Seu delivery merece um <span className="text-primary">cardápio à altura</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: "0.2s" }}>
            Crie seu cardápio digital em minutos. Receba pedidos, calcule fretes e gerencie tudo em um só lugar.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <Button variant="hero" size="lg" asChild className="text-base px-8">
              <Link to="/signup">
                Começar grátis
                <ArrowRight className="w-5 h-5 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-surface">
        <div className="container">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">Tudo que você precisa para vender mais</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {features.map((f, i) => (
              <div key={i} className="bg-card rounded-2xl p-8 border border-border shadow-sm hover:shadow-md transition-shadow animate-fade-in" style={{ animationDelay: `${0.1 * i}s` }}>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <f.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t border-border">
        <div className="container text-center text-muted-foreground text-sm">
          © {new Date().getFullYear()} EPRATO. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
};

export default Index;
