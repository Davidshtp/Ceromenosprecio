import React from "react";
import { TrendingUp, DollarSign, ShoppingCart, Users } from "lucide-react";
import { Card } from "../../components/ui";

const Analytics: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-text mb-2">Analítica</h2>
        <p className="text-text-secondary">Rendimiento e información de la plataforma</p>
      </div>

      {/* Coming Soon */}
      <Card className="text-center py-16">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-center space-x-4 mb-6">
            <TrendingUp className="w-12 h-12 text-accent opacity-50" />
            <DollarSign className="w-12 h-12 text-success opacity-50" />
            <ShoppingCart className="w-12 h-12 text-accent-secondary opacity-50" />
            <Users className="w-12 h-12 text-warning opacity-50" />
          </div>
          <h3 className="text-2xl font-bold text-text mb-3">
            El panel de analítica estará disponible pronto
          </h3>
          <p className="text-text-secondary text-lg mb-6">
            Los reportes avanzados están en desarrollo.
          </p>
          <div className="bg-bg-subtle rounded-lg p-6 text-left">
            <h4 className="font-semibold text-text mb-3">Funciones planeadas:</h4>
            <ul className="space-y-2 text-text-secondary">
              <li>• Tendencias y proyecciones de ingresos</li>
              <li>• Comparación del rendimiento de restaurantes</li>
              <li>• Analítica de pedidos y horas de mayor demanda</li>
              <li>• Información sobre el comportamiento de clientes</li>
              <li>• Métricas de suscripciones y cancelaciones</li>
              <li>• Exportación de reportes (PDF/Excel)</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Analytics;
