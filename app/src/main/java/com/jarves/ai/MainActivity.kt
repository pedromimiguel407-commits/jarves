package com.jarves.ai

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

private val Ink = Color(0xFF07111F)
private val Panel = Color(0xFF101E30)
private val Cyan = Color(0xFF48D9E8)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme(colorScheme = darkColorScheme(
                primary = Cyan, background = Ink, surface = Panel,
                onPrimary = Ink, onBackground = Color.White, onSurface = Color.White
            )) {
                JarvesApp(
                    load = { (securePrefs().getString("base_url", "") ?: "") to (securePrefs().getString("api_key", "") ?: "") },
                    save = { url, key ->
                        securePrefs().edit().putString("base_url", url).putString("api_key", key).apply()
                    }
                )
            }
        }
    }

    private fun securePrefs() = EncryptedSharedPreferences.create(
        this,
        "jarves_secure",
        MasterKey.Builder(this).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build(),
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )
}

private data class ChatMessage(val role: String, val content: String)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun JarvesApp(
    load: () -> Pair<String, String>,
    save: (String, String) -> Unit
) {
    val saved = remember { load() }
    var baseUrl by remember { mutableStateOf(saved.first) }
    var apiKey by remember { mutableStateOf(saved.second) }
    var draft by remember { mutableStateOf("") }
    var messages by remember { mutableStateOf(listOf<ChatMessage>()) }
    var busy by remember { mutableStateOf(false) }
    var status by remember { mutableStateOf("Configure o endereço HTTPS do gateway JARVES.") }
    val scope = rememberCoroutineScope()

    Scaffold(
        containerColor = Ink,
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("JARVES AI", fontWeight = FontWeight.Bold)
                        Text("ASSISTENTE ANDROID NATIVO", style = MaterialTheme.typography.labelSmall, color = Cyan)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Panel, titleContentColor = Color.White)
            )
        }
    ) { inset ->
        Column(
            Modifier.fillMaxSize().padding(inset).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            ElevatedCard(colors = CardDefaults.elevatedCardColors(containerColor = Panel)) {
                Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Conexão segura", fontWeight = FontWeight.SemiBold, color = Cyan)
                    OutlinedTextField(
                        value = baseUrl, onValueChange = { baseUrl = it },
                        label = { Text("URL HTTPS do gateway (ex.: https://seu-servidor)") },
                        singleLine = true, modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = apiKey, onValueChange = { apiKey = it },
                        label = { Text("API key JARVES (opcional no modo gratuito)") },
                        visualTransformation = PasswordVisualTransformation(),
                        singleLine = true, modifier = Modifier.fillMaxWidth()
                    )
                    Button(
                        onClick = {
                            save(baseUrl.trim().trimEnd('/'), apiKey.trim())
                            status = "Configuração salva com armazenamento criptografado."
                        },
                        modifier = Modifier.align(Alignment.End)
                    ) { Text("Salvar configuração") }
                }
            }

            Text(status, style = MaterialTheme.typography.bodySmall, color = Cyan)
            LazyColumn(
                modifier = Modifier.weight(1f).fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                if (messages.isEmpty()) {
                    item {
                        Text(
                            "Olá! Sou o JARVES. Configure o gateway acima e envie sua primeira mensagem.",
                            color = Color.LightGray,
                            modifier = Modifier.padding(vertical = 18.dp)
                        )
                    }
                }
                items(messages) { message ->
                    val user = message.role == "user"
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = if (user) Arrangement.End else Arrangement.Start) {
                        Surface(
                            color = if (user) Color(0xFF164452) else Panel,
                            shape = RoundedCornerShape(16.dp),
                            modifier = Modifier.widthIn(max = 320.dp)
                        ) {
                            Text(message.content, Modifier.padding(12.dp), color = Color.White)
                        }
                    }
                }
                if (busy) item { CircularProgressIndicator(color = Cyan, modifier = Modifier.size(24.dp)) }
            }

            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = draft, onValueChange = { draft = it },
                    modifier = Modifier.weight(1f),
                    placeholder = { Text("Escreva para o JARVES…") },
                    maxLines = 4
                )
                FilledIconButton(
                    enabled = !busy && draft.isNotBlank(),
                    onClick = {
                        val prompt = draft.trim()
                        if (baseUrl.isBlank() || !baseUrl.startsWith("https://")) {
                            status = "Informe uma URL HTTPS válida para o gateway."
                        } else {
                            draft = ""
                            messages = messages + ChatMessage("user", prompt)
                            busy = true
                            scope.launch {
                                try {
                                    val answer = withContext(Dispatchers.IO) {
                                        requestJarves(baseUrl.trim().trimEnd('/'), apiKey.trim(), messages + ChatMessage("user", prompt))
                                    }
                                    messages = messages + ChatMessage("assistant", answer)
                                    status = "Conectado ao gateway JARVES."
                                } catch (e: Exception) {
                                    status = "Falha na conexão: ${e.message ?: "erro desconhecido"}"
                                    messages = messages + ChatMessage("assistant", "Não consegui acessar o gateway. Verifique a URL, a chave e a conexão.")
                                } finally { busy = false }
                            }
                        }
                    }
                ) { Icon(Icons.Default.Send, contentDescription = "Enviar") }
            }
        }
    }
}

private fun requestJarves(baseUrl: String, apiKey: String, history: List<ChatMessage>): String {
    val client = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(120, TimeUnit.SECONDS)
        .callTimeout(130, TimeUnit.SECONDS)
        .build()
    val msgs = JSONArray()
    history.takeLast(20).forEach { item ->
        msgs.put(JSONObject().put("role", item.role).put("content", item.content))
    }
    val payload = JSONObject()
        .put("model", "jarves-auto")
        .put("messages", msgs)
        .put("stream", false)
        .put("max_tokens", 1800)
    val requestBuilder = Request.Builder()
        .url("$baseUrl/v1/chat/completions")
        .post(payload.toString().toRequestBody("application/json; charset=utf-8".toMediaType()))
        .header("Accept", "application/json")
    if (apiKey.isNotBlank()) requestBuilder.header("Authorization", "Bearer $apiKey")
    client.newCall(requestBuilder.build()).execute().use { response ->
        val body = response.body?.string().orEmpty()
        if (!response.isSuccessful) {
            val detail = runCatching { JSONObject(body).optJSONObject("error")?.optString("message") }.getOrNull()
            throw IllegalStateException(detail?.takeIf { it.isNotBlank() } ?: "HTTP ${response.code}")
        }
        val root = JSONObject(body)
        return root.optJSONArray("choices")
            ?.optJSONObject(0)?.optJSONObject("message")?.optString("content")
            ?.takeIf { it.isNotBlank() }
            ?: throw IllegalStateException("O gateway retornou uma resposta vazia.")
    }
}
