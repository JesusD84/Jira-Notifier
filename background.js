// Reemplaza con tu información
let jiraDomain;
let bearerToken;

// Aquí puedes almacenar dinámicamente las JQLs que el usuario quiere monitorear
let jqlQueries = [];

// Tickets
let tickets = new Map();

function testConnection(jiraServerUrl, pat, sendResponse) {
    // Configuración del request con Authorization
    fetch(`${jiraServerUrl}/rest/api/2/myself`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${pat}`, // Autenticación usando Bearer Token
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        console.log(response);
        console.log("RateLimit: ", response.headers.get('X-RateLimit-Limit'));
        console.log("Rate Remaining: ", response.headers.get('X-RateLimit-Remaining'));
        if (response.ok) {
            console.log('Response ok');
            jiraDomain = jiraServerUrl;
            bearerToken = pat;
            sendResponse({ success: true });
        
        } else {
            console.log('Responde not ok')
            jiraDomain = null;
            bearerToken = null;
            sendResponse({ success: false });
        }
    })
    .catch(error => {
        console.error("Connection test failed:", error);
        sendResponse({ success: false });
    });
}


// Función para agregar una JQL a la lista
function addJQL(jql) {
    if (!jqlQueries.includes(jql)) {
        jqlQueries.push(jql);
        console.log(`JQL agregada: ${jql}`);
    } else {
        console.log(`La JQL ya está agregada: ${jql}`);
    }
}

// Función para eliminar una JQL de la lista
function removeJQL(jql) {
    const index = jqlQueries.indexOf(jql);
    if (index > -1) {
        jqlQueries.splice(index, 1);
        console.log(`JQL eliminada: ${jql}`);
    } else {
        console.log(`La JQL no está en la lista: ${jql}`);
    }
}

// Función para establecer el número de tickets en el badge del icono de la extensión
function updateBadge() {
    chrome.storage.local.get("tickets", (result) => {
        const ticketCount = result.tickets ? result.tickets.length : 0;
        chrome.action.setBadgeText({ text: ticketCount > 0 ? ticketCount.toString() : "" });
        chrome.action.setBadgeBackgroundColor({ color: "#084aad" }); // Cambia el color del badge si lo deseas
    });
}

// Función para consultar Jira con cada JQL
function fetchJiraQueries() {
    if (jqlQueries.length > 0 && jiraDomain && bearerToken) {
        jqlQueries.forEach((jql) => {
            console.log("Consultando JQL: ", jql);
            fetch(`${jiraDomain}/rest/api/2/search?jql=${encodeURIComponent(jql)}`, {
                method: 'GET',
                headers: {
                'Authorization': `Bearer ${bearerToken}`,
                'Content-Type': 'application/json'
                }
            })
                .then(response => {
                    console.log("RateLimit: ", response.headers.get('X-RateLimit-Limit'));
                    console.log("Rate Remaining: ", response.headers.get('X-RateLimit-Remaining'));
                    return response.json();
                })
                .then(data => {
                    console.log("Resultados para la consulta:", jql, data);
                
                    // Obtener las claves actuales de los issues en data.issues
                    const currentKeys = new Set(data.issues.map(issue => issue.key));
                
                    // Inicializamos la bandera para verificar cambios
                    let hasChanged = false;
                
                    // Eliminar elementos de `tickets` que ya no están en `data.issues`
                    for (let key of tickets.keys()) {
                        if (!currentKeys.has(key)) {
                            tickets.delete(key);
                            hasChanged = true;  // Marcamos que ha habido un cambio
                        }
                    }
                
                    // Agregar nuevos elementos a `tickets`
                    for (let issue of data.issues) {
                        if (!tickets.has(issue.key)) {
                            // Crear el nuevo objeto `ticket`
                            let ticket = {
                                key: issue.key,
                                summary: issue.fields.summary,  // Ajusta según tu estructura de datos
                                created: issue.fields.created,
                                link: `${jiraDomain}/browse/${issue.key}`
                            };
                            tickets.set(issue.key, ticket);
                            hasChanged = true;  // Marcamos que ha habido un cambio
                        }
                    }
                
                    // Solo enviamos el mensaje si ha habido algún cambio en `tickets`
                    if (hasChanged) {
                        // Guardar tickets en chrome.storage.local
                        chrome.storage.local.set({ tickets: Array.from(tickets.values()) }, () => {
                            console.log("Tickets actualizados guardados en chrome.storage.local.");
                            updateBadge();  // Actualizar el badge con el número de tickets
                        });

                        // Enviar mensaje a popup.js
                        chrome.runtime.sendMessage({ tickets: Array.from(tickets.values()) });
                    }
                })
                .catch(error => {
                    console.error("Error al consultar JQL:", jql, error);
                });
                
        });
    } else {
        console.log("No se puede ejecutar la consulta: faltan JQLs, dominio o token.");

        // Borrar los tickets del storage
        chrome.storage.local.remove("tickets", () => {
            console.log("Tickets eliminados de chrome.storage.local debido a falta de datos de configuración.");

            // Limpiar el badge
            chrome.action.setBadgeText({ text: "" });

            // Enviar un mensaje indicando que no hay tickets
            chrome.runtime.sendMessage({ tickets: [] });
        });
    }
}
  
// Intervalo de consulta cada minuto
setInterval(() => {
    fetchJiraQueries();
}, 60000); // 60000 ms = 1 minuto


// Escucha para agregar y eliminar JQLs a través de la extensión
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("se recibio mensaje: ", message);

    if (message.action === 'testConnection') {
        testConnection(message.jiraServerUrl, message.pat, sendResponse);
        // Indica que la respuesta es asíncrona
        return true;
    } else if(message.action === 'addJQL') {
        addJQL(message.jql);
        sendResponse({ status: 'JQL agregada' });
    } else if (message.action === 'removeJQL') {
        removeJQL(message.jql);
        sendResponse({ status: 'JQL eliminada' });
    }
});