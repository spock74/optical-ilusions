import { translations } from './src/i18n.js';
'use strict';

// --- CONFIGURAÇÃO E CONSTANTES GLOBAIS ---
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
const SYSTEM_PROMPT = "Aja como um comunicador de ciência e professor de psicofisiologia e neurofisiologia. As suas explicações devem ser claras, concisas e fascinantes, usando analogias simples para explicar conceitos complexos. Responda em português do Brasil.";
const USER_QUERY = "Explique o fenómeno de percepção visual demonstrado nesta animação. Múltiplos pontos brancos estão a mover-se para a frente e para trás em linhas retas (movimento harmónico simples) em diferentes eixos. No entanto, quando vistos em conjunto, nós humanos interpreta o seu movimento combinado como uma rotação circular. Explique por que esta ilusão de ótica acontece.";
const FALLBACK_EXPLANATION = "Olá! Essa animação demonstra um fenômeno fascinante da percepção visual, que chamamos de **ilusão de movimento induzido**. Não estamos vendo rotação real, mas sim nosso cérebro \"interpretando\" o movimento linear de múltiplos pontos como uma rotação. Isso acontece por causa de como nosso sistema visual processa a informação. Imagine que seu cérebro é um detetive investigando uma cena. Ele recebe pistas individuais (os pontos se movendo em linha reta) e, para tornar tudo mais fácil de entender, tenta encontrar o padrão mais simples que explique todas as pistas. Em vez de processar cada ponto independentemente – o que seria um trabalho gigantesco – ele busca uma explicação global, mais econômica. A rotação é essa explicação mais simples. Nosso cérebro é excelente em identificar padrões e movimentos. Ele \"prefere\" ver um movimento contínuo e organizado (a rotação) do que um conjunto confuso de movimentos lineares independentes. É como conectar os pontos de uma constelação: você não vê só pontos de luz, mas formas familiares. Podemos pensar em algumas razões que contribuem para essa interpretação errônea: * **Limitações do processamento paralelo:** Nosso cérebro não processa todas as informações simultaneamente com a mesma precisão. Ele faz aproximações e inferências para economizar energia e tempo. Ao ver múltiplos pontos em movimento, ele escolhe a interpretação mais plausível, que é, neste caso, a rotação. * **Falta de contexto:** A animação não oferece nenhum ponto de referência estável. Sem referências, é difícil para o cérebro avaliar a profundidade e a distância exata de cada ponto, levando-o a interpretar o movimento de forma diferente. * **Preferencia por padrões:** Nosso cérebro busca padrões e ordem em informações sensoriais. A percepção de rotação é um padrão mais organizado e harmonioso do que a percepção de pontos se movendo aleatoriamente. Em resumo, essa ilusão não é uma falha, mas uma demonstração de como o nosso sistema visual trabalha de forma inteligente, mas também simplificada. Ele busca a interpretação mais eficiente, mesmo que essa interpretação não seja a realidade física observada. É uma bela demonstração de como a nossa percepção é construída ativamente pelo cérebro, e não simplesmente uma cópia passiva do mundo externo.";

const PONTO_COR = 'white';
const FUNDO_COR = '#d40000';
const LINHA_COR = 'black';
const LINHA_LARGURA = 2;
const PONTO_RAIO = 12;
const CANVAS_RAIO = 220;
const NUM_PONTOS = 8;
const FASE1_DURACAO = 400; // frames
const OSCILACOES_POR_LINHA = 4 * Math.PI;

// --- ELEMENTOS DA DOM ---
const elementos = {
    canvas: document.getElementById('animacaoCanvas'),
    descricaoFase: document.getElementById('descricaoFase'),
    velocidadeSlider: document.getElementById('velocidadeSlider'),
    btnIniciar: document.getElementById('btnIniciar'),
    btnParar: document.getElementById('btnParar'),
    btnContinuar: document.getElementById('btnContinuar'),
    btnTerminar: document.getElementById('btnTerminar'),
    btnExplicar: document.getElementById('btnExplicar'),
    btnPesquisarNerds: document.getElementById('btnPesquisarNerds'),
    langPT: document.getElementById('lang-pt'),
    langEN: document.getElementById('lang-en'),
    geminiContainer: document.getElementById('gemini-response-container'),
    geminiLoader: document.getElementById('gemini-loader'),
    geminiText: document.getElementById('gemini-response-text'),
    nerdsButtonContainer: document.getElementById('nerds-button-container'),
    nerdModal: document.getElementById('nerd-modal'),
    nerdModalOk: document.getElementById('nerd-modal-ok'),
    mainBody: document.getElementById('main-body')
};

// --- ESTADO DA APLICAÇÃO ---
const estado = {
    app: 'IDLE', // IDLE, RUNNING, PAUSED
    isGeminiLoading: false,
    animationFrameId: null,
    faseAnimacao: 1,
    anguloBase: 0,
    pontos: [],
    linhasVisiveis: 0,
    contadorTempo: 0,
    anguloBaseNaUltimaAdicao: 0,
    currentLanguage: 'pt-BR'
};

const ctx = elementos.canvas.getContext('2d');
const centroX = elementos.canvas.width / 2;
const centroY = elementos.canvas.height / 2;

// --- LÓGICA DE INTERNACIONALIZAÇÃO (i18n) ---
function setLanguage(lang) {
    estado.currentLanguage = lang;
    document.documentElement.lang = lang.split('-')[0];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) {
            el.textContent = translations[lang][key];
        }
    });
    document.title = translations[lang].title;
    if (estado.app === 'IDLE') {
        elementos.descricaoFase.textContent = translations[lang].clickToStart;
    }
}

// --- CLASSE PONTO ---
class Ponto {
    constructor(anguloOffset) {
        this.anguloOffset = anguloOffset;
    }

    desenhar(oscilacao) {
        const distancia = CANVAS_RAIO * Math.cos(oscilacao + this.anguloOffset);
        const x = centroX + distancia * Math.cos(this.anguloOffset);
        const y = centroY + distancia * Math.sin(this.anguloOffset);
        ctx.beginPath();
        ctx.arc(x, y, PONTO_RAIO, 0, Math.PI * 2);
        ctx.fillStyle = PONTO_COR;
        ctx.fill();
    }
}

// --- FUNÇÕES DE DESENHO ---
function desenharFundo() {
    ctx.fillStyle = FUNDO_COR;
    ctx.beginPath();
    ctx.arc(centroX, centroY, CANVAS_RAIO, 0, Math.PI * 2);
    ctx.fill();
}

function resetarCanvas() {
    ctx.clearRect(0, 0, elementos.canvas.width, elementos.canvas.height);
    desenharFundo();
    elementos.descricaoFase.textContent = translations[estado.currentLanguage].clickToStart;
}

// --- FUNÇÕES DE LÓGICA DA UI ---
function atualizarEstadoBotoes() {
    elementos.btnIniciar.disabled = estado.app !== 'IDLE';
    elementos.btnParar.disabled = estado.app !== 'RUNNING';
    elementos.btnContinuar.disabled = estado.app !== 'PAUSED';
    elementos.btnTerminar.disabled = estado.app === 'IDLE';
    elementos.btnExplicar.disabled = estado.app === 'IDLE' || estado.isGeminiLoading;
    elementos.btnPesquisarNerds.disabled = estado.isGeminiLoading;
}

function mostrarConteudo(container, loader, content) {
    if (container) container.style.display = 'block';
    if (loader) loader.style.display = 'block';
    if (content) content.innerHTML = '';
}

function esconderConteudo(container, loader) {
    if (container) container.style.display = 'none';
    if (loader) loader.style.display = 'none';
}

// --- LÓGICA DA API GEMINI ---
async function fetchExplanation() {
    estado.isGeminiLoading = true;
    mostrarConteudo(elementos.geminiContainer, elementos.geminiLoader, elementos.geminiText);
    esconderConteudo(elementos.nerdsButtonContainer);
    atualizarEstadoBotoes();

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
                contents: [{ parts: [{ text: USER_QUERY }] }],
            })
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const result = await response.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
        elementos.geminiText.innerHTML = text ? text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                                        .replace(/\*([^*]+)\*/g, '<em>$1</em>') : FALLBACK_EXPLANATION;

        if (text) {
            elementos.nerdsButtonContainer.style.display = 'flex';
        }

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        elementos.geminiText.innerHTML = FALLBACK_EXPLANATION;
    } finally {
        estado.isGeminiLoading = false;
        elementos.geminiLoader.style.display = 'none';
        atualizarEstadoBotoes();
    }
}

// --- LÓGICA DA PESQUISA NERD ---
function handleNerdSearch() {
    elementos.nerdModal.classList.add('visible');
    elementos.mainBody.style.overflow = 'hidden';
}

function closeNerdModal() {
    elementos.nerdModal.classList.remove('visible');
    elementos.mainBody.style.overflow = 'auto';
}

// --- LÓGICA DA ANIMAÇÃO ---
function inicializarAnimacao() {
    Object.assign(estado, {
        faseAnimacao: 1, anguloBase: 0, linhasVisiveis: 0,
        contadorTempo: 0, pontos: [], anguloBaseNaUltimaAdicao: 0
    });
    for (let i = 0; i < NUM_PONTOS; i++) {
        const angulo = (i / NUM_PONTOS) * Math.PI;
        estado.pontos.push(new Ponto(angulo));
    }
}

function animate() {
    if (estado.app === 'PAUSED') {
        estado.animationFrameId = requestAnimationFrame(animate);
        return;
    }
    if (estado.app !== 'RUNNING') return;

    const velocidade = parseFloat(elementos.velocidadeSlider.value) / 1000;
    
    ctx.clearRect(0, 0, elementos.canvas.width, elementos.canvas.height);
    desenharFundo();
    estado.anguloBase += velocidade;

    if (estado.faseAnimacao === 1) {
        elementos.descricaoFase.textContent = translations[estado.currentLanguage].phase1Description;
        estado.pontos.forEach(ponto => ponto.desenhar(estado.anguloBase));
        estado.contadorTempo++;
        if (estado.contadorTempo > FASE1_DURACAO) {
            estado.faseAnimacao = 2;
            estado.contadorTempo = 0;
            estado.linhasVisiveis = 1;
            estado.anguloBaseNaUltimaAdicao = estado.anguloBase;
        }
    } else if (estado.faseAnimacao === 2) {
        elementos.descricaoFase.textContent = translations[estado.currentLanguage].phase2Description;
        ctx.strokeStyle = LINHA_COR;
        ctx.lineWidth = LINHA_LARGURA;
        for (let i = 0; i < estado.linhasVisiveis; i++) {
            const anguloLinha = estado.pontos[i].anguloOffset;
            const xFinal = centroX + CANVAS_RAIO * Math.cos(anguloLinha);
            const yFinal = centroY + CANVAS_RAIO * Math.sin(anguloLinha);
            ctx.beginPath();
            ctx.moveTo(centroX * 2 - xFinal, centroY * 2 - yFinal);
            ctx.lineTo(xFinal, yFinal);
            ctx.stroke();
        }
        for (let i = 0; i < estado.linhasVisiveis; i++) {
            estado.pontos[i].desenhar(estado.anguloBase);
        }

        if (estado.anguloBase - estado.anguloBaseNaUltimaAdicao >= OSCILACOES_POR_LINHA) {
            if (estado.linhasVisiveis < NUM_PONTOS) {
                estado.linhasVisiveis++;
                estado.anguloBaseNaUltimaAdicao = estado.anguloBase;
            }
        }
    }
    estado.animationFrameId = requestAnimationFrame(animate);
}

// --- EVENT LISTENERS ---
function setupEventListeners() {
    elementos.langPT.addEventListener('click', () => setLanguage('pt-BR'));
    elementos.langEN.addEventListener('click', () => setLanguage('en'));

    elementos.btnIniciar.addEventListener('click', () => {
        if (estado.app === 'IDLE') {
            estado.app = 'RUNNING';
            inicializarAnimacao();
            atualizarEstadoBotoes();
            animate();
        }
    });

    elementos.btnParar.addEventListener('click', () => {
        if (estado.app === 'RUNNING') {
            estado.app = 'PAUSED';
            elementos.descricaoFase.textContent = translations[estado.currentLanguage].animationPaused;
            atualizarEstadoBotoes();
        }
    });

    elementos.btnContinuar.addEventListener('click', () => {
        if (estado.app === 'PAUSED') {
            estado.app = 'RUNNING';
            atualizarEstadoBotoes();
        }
    });

    elementos.btnTerminar.addEventListener('click', () => {
        estado.app = 'IDLE';
        cancelAnimationFrame(estado.animationFrameId);
        estado.animationFrameId = null;
        resetarCanvas();
        atualizarEstadoBotoes();
        esconderConteudo(elementos.geminiContainer, elementos.geminiLoader);
        esconderConteudo(elementos.nerdsButtonContainer);
    });

    elementos.btnExplicar.addEventListener('click', () => {
        if (elementos.geminiContainer.style.display === 'block') {
            esconderConteudo(elementos.geminiContainer, elementos.geminiLoader);
            esconderConteudo(elementos.nerdsButtonContainer);
        } else {
            fetchExplanation();
        }
    });

    elementos.btnPesquisarNerds.addEventListener('click', handleNerdSearch);
    elementos.nerdModalOk.addEventListener('click', closeNerdModal);
}

// --- INICIALIZAÇÃO DA APLICAÇÃO ---
window.onload = () => {
    setLanguage(estado.currentLanguage);
    resetarCanvas();
    atualizarEstadoBotoes();
    setupEventListeners();
};