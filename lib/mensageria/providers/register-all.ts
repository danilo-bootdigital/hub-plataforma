// Composition root da Mensageria: importar este módulo AUTO-REGISTRA todos os
// adapters concretos no registry (efeito de importação). É o ÚNICO lugar que
// conhece o conjunto de providers concretos — mantém o domínio (registry/tipos)
// e o app (route handlers) agnósticos. Adicionar um provider = mais um import aqui.

import './cloud-api'
