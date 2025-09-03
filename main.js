import { translations } from './src/i18n.js';
'use strict';

// --- CONFIGURAÇÃO E CONSTANTES GLOBAIS ---
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
const SYSTEM_PROMPT = "Aja como um comunicador de ciência e professor de psicofisiologia e neurofisiologia. As suas explicações devem ser claras, concisas e fascinantes, usando analogias simples para explicar conceitos complexos. Responda em português do Brasil.";
const USER_QUERY = "Explique o fenómeno de percepção visual demonstrado nesta animação. Múltiplos pontos brancos estão a mover-se para a frente e para trás em linhas retas (movimento harmónico simples) em diferentes eixos. No entanto, quando vistos em conjunto, nós humanos interpreta o seu movimento combinado como uma rotação circular. Explique por que esta ilusão de ótica acontece.";

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
    nerdContainer: document.getElementById('nerd-response-container'),
    nerdLoader: document.getElementById('nerd-loader'),
    nerdContent: document.getElementById('nerd-content')
};

// --- ESTADO DA APLICAÇÃO ---
const estado = {
    app: 'IDLE', // IDLE, RUNNING, PAUSED
    isGeminiLoading: false,
    isNerdSearchLoading: false,
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

// --- ARTIGOS CIENTÍFICOS ---
const artigosCientificos = {
    queries: [
        { title: '("visual perception" OR "motion perception") AND ("Gestalt principles" OR "emergent properties")', link: 'https://www.ncbi.nlm.nih.gov/pmc/?term=(%22visual+perception%22+OR+%22motion+perception%22)+AND+(%22Gestalt+principles%22+OR+%22emergent+properties%22)' },
        { title: '"circular motion illusion" OR "visual motion illusion"', link: 'https://www.ncbi.nlm.nih.gov/pmc/?term=%22circular+motion+illusion%22+OR+%22visual+motion+illusion%22' }
    ],
    revisoes: [
        { title: "A Primer on Gestalt Psychology", link: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8978553/", journal: "Frontiers in Psychology, 2022" },
        { title: "Gestalt theory rearranged: Back to Wertheimer", link: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4535213/", journal: "Frontiers in Psychology, 2015" }
    ],
    experimentais: [
        { title: "Neural correlates of the vibrating motion illusion in human V5/MT+", link: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8107931/", journal: "NeuroImage, 2021" }
    ]
};

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
    elementos.btnExplicar.disabled = estado.app === 'IDLE' || estado.isGeminiLoading || estado.isNerdSearchLoading;
    elementos.btnPesquisarNerds.disabled = estado.isNerdSearchLoading || estado.isGeminiLoading;
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
    esconderConteudo(elementos.nerdContainer, elementos.nerdLoader);
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
        elementos.geminiText.textContent = text || "Não foi possível obter uma explicação. Tente novamente.";
        if (text) {
            elementos.nerdsButtonContainer.style.display = 'flex';
        }

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        elementos.geminiText.textContent = "Ocorreu um erro ao comunicar com a API. Verifique a consola para mais detalhes.";
    } finally {
        estado.isGeminiLoading = false;
        elementos.geminiLoader.style.display = 'none';
        atualizarEstadoBotoes();
    }
}

// --- LÓGICA DA PESQUISA NERD ---
function handleNerdSearch() {
    if (elementos.nerdContainer.style.display === 'block') {
        esconderConteudo(elementos.nerdContainer, elementos.nerdLoader);
        return;
    }

    estado.isNerdSearchLoading = true;
    mostrarConteudo(elementos.nerdContainer, elementos.nerdLoader, elementos.nerdContent);
    atualizarEstadoBotoes();

    setTimeout(() => {
        let htmlContent = `<h4>${translations[estado.currentLanguage].pmcQueries}</h4><ul>`;
        artigosCientificos.queries.forEach(query => {
            htmlContent += `<li><a href="${query.link}" target="_blank">${query.title}</a></li>`;
        });
        htmlContent += '</ul>';

        htmlContent += `<h4 style="margin-top: 20px;">${translations[estado.currentLanguage].reviewArticles}</h4><ul>`;
        artigosCientificos.revisoes.forEach(art => {
            htmlContent += `<li><a href="${art.link}" target="_blank">${art.title}</a> (${art.journal})</li>`;
        });
        htmlContent += '</ul>';

        htmlContent += `<h4 style="margin-top: 20px;">${translations[estado.currentLanguage].recentExperimentalArticles}</h4><ul>`;
        artigosCientificos.experimentais.forEach(art => {
            htmlContent += `<li><a href="${art.link}" target="_blank">${art.title}</a> (${art.journal})</li>`;
        });
        htmlContent += '</ul>';

        elementos.nerdContent.innerHTML = htmlContent;
        estado.isNerdSearchLoading = false;
        elementos.nerdLoader.style.display = 'none';
        atualizarEstadoBotoes();
    }, 1000);
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
        esconderConteudo(elementos.nerdContainer, elementos.nerdLoader);
    });

    elementos.btnExplicar.addEventListener('click', () => {
        if (elementos.geminiContainer.style.display === 'block') {
            esconderConteudo(elementos.geminiContainer, elementos.geminiLoader);
            esconderConteudo(elementos.nerdsButtonContainer);
            esconderConteudo(elementos.nerdContainer, elementos.nerdLoader);
        } else {
            fetchExplanation();
        }
    });

    elementos.btnPesquisarNerds.addEventListener('click', handleNerdSearch);
}

// --- INICIALIZAÇÃO DA APLICAÇÃO ---
window.onload = () => {
    setLanguage(estado.currentLanguage);
    resetarCanvas();
    atualizarEstadoBotoes();
    setupEventListeners();
};