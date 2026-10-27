# Mesada Inteligente

Crie agora um aplicativo funcional chamado Mesada Inteligente, em português brasileiro, mobile-first PWA instalável no Safari de dois iPhones. Público: pai/mãe e filha de 12 anos. Visual moderno, divertido sem infantilizar, acessível, tons lilás/azul, navegação inferior. Modelo híbrido: mesada base R$20/semana configurável, independente de tarefas; tarefas extras pagas com valores configuráveis; saldo apenas virtual, sem banco/Pix integrado. Perfis parent e child, login seguro e família com código de convite; criança não pode alterar valores nem aprovar suas tarefas. Painel da criança: tarefas diárias/semanais, marcar concluída e solicitar aprovação, saldo disponível, saldo reservado, meta de compra e progresso, extrato. Painel dos pais: criar/editar/pausar tarefas e frequência, aprovar/rejeitar com comentário, configurar mesada, fechar semana com prevenção de duplicidade, registrar pagamento manual com data e observação, adicionar/retirar reserva do cofrinho, histórico auditável de lançamentos. Saldo deve derivar de ledger imutável com valores em centavos, transações atômicas e idempotentes; distinguir valor acumulado, pagamento efetuado e saldo ainda devido; nunca confundir saldo de cofrinho com dinheiro realmente custodiado. Persistência real em backend e RLS por família/role; jamais expor dados entre famílias; validações no servidor. Onboarding simples, dados de demonstração apenas em modo demo claramente rotulado e sem misturar com dados reais. Se backend/auth exigir ativação, configure o máximo possível e descreva precisamente o que falta. Entregue telas navegáveis e fluxos utilizáveis, sem botões falsos. Não publique publicamente sem autorização. Inclua instruções de teste e de adicionar à tela inicial do iPhone.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/412d63f9-9e89-4a98-b14a-976336e18d24).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
