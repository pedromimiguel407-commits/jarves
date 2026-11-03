# JARVES Android nativo

Este diretório contém um aplicativo Android nativo em Kotlin + Jetpack Compose. Não é um WebView: a interface de chat e as telas de configuração são componentes Android.

## Requisitos
- Android 7.0 (API 24) ou superior.
- JDK 17 e Gradle 8.9+ (o workflow do GitHub Actions configura o ambiente).
- Gateway JARVES publicado e acessível por HTTPS.

## Compilar
Na raiz do repositório:

```bash
gradle --no-daemon :app:assembleDebug
```

APK de depuração: `app/build/outputs/apk/debug/app-debug.apk`.

## Conectar a IA
1. Abra o app e informe a URL HTTPS do servidor que hospeda o gateway JARVES.
2. Opcionalmente informe uma API key JARVES criada pelo próprio gateway.
3. Toque em **Salvar configuração** e envie uma mensagem.

O app chama `POST /v1/chat/completions` usando o formato compatível com OpenAI já oferecido pelo servidor JARVES.

## Segurança das chaves
- Não existe chave Gemini nem chave de provedor embutida no APK.
- A chave JARVES informada pelo usuário é armazenada com AndroidX Security Crypto.
- A chave Gemini/provedor deve permanecer no servidor, em variável de ambiente/secret (por exemplo `UPSTREAM_KEY`), nunca em arquivos versionados ou no APK.
- A chave compartilhada anteriormente na conversa deve ser revogada e substituída. Não a reutilize.
- Use somente endpoint HTTPS; tráfego HTTP em texto claro está desativado.

## Escopo desta primeira versão
Chat nativo conectado ao gateway, configuração segura e estado de conexão. O restante dos módulos avançados da interface web ainda não foi portado para telas nativas. O APK de debug não é uma versão assinada para distribuição na Play Store.
