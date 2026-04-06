import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";
import { TERMS } from "@/components/LogisticsTermsModal";

const TermsPage = () => (
  <div className="space-y-6 animate-fade-in max-w-2xl">
    <h1 className="text-2xl font-bold text-foreground">Termos e Responsabilidades</h1>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Termo de Intermediação e Isenção de Responsabilidade
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="list-decimal list-inside space-y-4 text-sm text-foreground leading-relaxed">
          {TERMS.map((term, i) => (
            <li key={i}>{term}</li>
          ))}
        </ol>
      </CardContent>
    </Card>
  </div>
);

export default TermsPage;
