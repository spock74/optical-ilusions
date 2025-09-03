# Ilusão de Movimento Circular Interativa

Este projeto é uma demonstração interativa de uma fascinante ilusão de ótica onde múltiplos pontos, movendo-se em linhas retas, criam a percepção de um movimento circular contínuo. A aplicação web permite aos usuários visualizar a ilusão, entender como ela funciona e obter uma explicação científica gerada pela API do Google Gemini.

**Nota:** Este é um projeto em estágio inicial. Novas funcionalidades e melhorias serão adicionadas no futuro.

## Demo ao Vivo

[Acesse a demonstração interativa aqui](https://spock74.github.io/optical-ilusions/)

## Funcionalidades

*   **Animação Interativa:** Controle a velocidade da animação e observe como a percepção da rotação muda.
*   **Visualização em Duas Fases:**
    1.  **Fase 1:** Observe os pontos movendo-se em conjunto, criando a ilusão de uma rotação perfeita.
    2.  **Fase 2:** As linhas retas em que cada ponto se move são reveladas, quebrando a ilusão e mostrando a realidade do movimento.
*   **Explicação com IA:** Clique no botão "✨ Explicar Fenómeno" para obter uma explicação científica clara e concisa sobre por que essa ilusão de ótica ocorre, gerada pelo modelo de linguagem Gemini 1.5 Flash do Google.
*   **Para Nerds:** Para os entusiastas, uma seção especial fornece links para artigos científicos e pesquisas sobre percepção visual e os princípios da Gestalt.
*   **Internacionalização:** A interface está disponível em Português e Inglês.

## Como Funciona

A ilusão é criada pela sobreposição de múltiplos movimentos harmónicos simples. Cada ponto branco oscila para frente e para trás ao longo de um eixo linear. No entanto, quando vários pontos se movem simultaneamente em eixos diferentes, o cérebro humano, seguindo os princípios da Gestalt de continuidade e movimento comum, integra esses movimentos lineares em uma única e coerente percepção de rotação.

## Tecnologias Utilizadas

*   **HTML5 Canvas:** Para a renderização da animação.
*   **CSS3:** Para a estilização da interface.
*   **JavaScript (ES6+):** Para a lógica da animação, interatividade e integração com a API.
*   **Google Gemini API:** Para gerar as explicações científicas.
*   **Vite:** Para o ambiente de desenvolvimento.

## Como Executar Localmente

Para executar este projeto em sua máquina local, siga os passos abaixo:

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/spock74/optical-ilusions.git
    cd optical-ilusions
    ```

2.  **Instale as dependências:**
    ```bash
    npm install
    ```

3.  **Configure a sua chave da API Gemini:**
    *   Crie um arquivo chamado `.env` na raiz do projeto.
    *   Adicione sua chave da API da seguinte forma:
        ```
        VITE_GEMINI_API_KEY=SUA_CHAVE_DA_API_AQUI
        ```
    *   Você pode obter uma chave da API no [Google AI Studio](https://aistudio.google.com/app/apikey).

4.  **Inicie o servidor de desenvolvimento:**
    ```bash
    npm run dev
    ```
    Abra o seu navegador e acesse o endereço fornecido pelo Vite (geralmente `http://localhost:5173`).

## Futuro Desenvolvimento

Este projeto é um trabalho em andamento. Algumas das funcionalidades planejadas para o futuro incluem:

*   Adicionar mais tipos de ilusões de ótica.
*   Permitir maior personalização da animação (número de pontos, cores, etc.).
*   Aprofundar as explicações científicas com mais detalhes e referências.
*   Melhorar a acessibilidade da aplicação.

## Contribuições

Contribuições são bem-vindas! Se você tiver ideias para melhorias, novas funcionalidades ou correções de bugs, sinta-se à vontade para abrir uma *issue* ou enviar um *pull request*.

## Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.
