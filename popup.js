document.addEventListener('DOMContentLoaded', () => {
  
  const jqlInput = document.getElementById('jql');
  const jqlList = document.getElementById('jqlList');
  const addJqlButton = document.getElementById('addJql');
  const jiraLinks = document.querySelectorAll('.jira-item__link');
  
  const tabs = document.querySelectorAll('.tab');
  const tabItems = document.querySelectorAll('.tab-item');

  const connectButton = document.querySelector('.button__link');
  const plusDownloadContainer = document.querySelector('.plus-download');
  
  const jiraServerInput = document.getElementById('jira-server');
  const saveJiraServerButton = document.getElementById('addJiraServer');
  const buttonJiraServerText = saveJiraServerButton.querySelector('.button__text');

  const PatInput = document.getElementById('pat');
  const savePatButton = document.getElementById('addPAT');
  const buttonPatText = savePatButton.querySelector('.button__text');


  // Al cargar el popup, intenta cargar los tickets desde el almacenamiento y renderizarlos
  chrome.storage.local.get('tickets', (result) => {
      if (result.tickets) {
          renderTickets(result.tickets);
      }
  });
  
  // Escuchar los mensajes de background.js
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.tickets) {
        // Guardar los tickets en chrome.storage.local para persistencia
        chrome.storage.local.set({ tickets: message.tickets });
        
        // Renderizar los tickets
        renderTickets(message.tickets);
    }
  });

  // Función para renderizar los tickets en el DOM
  function renderTickets(tickets) {
    const ticketContainer = document.getElementById('jira-tickets');
    ticketContainer.innerHTML = '';

    tickets.sort((a, b) => new Date(b.created) - new Date(a.created));

    tickets.forEach(ticket => {
        const ticketElement = document.createElement('div');
        ticketElement.className = 'jira-item__heading';
        ticketElement.innerHTML = `
            <a class="jira-item__link" href="${ticket.link}" target="_blank">
                <span class="jira-item__name">${ticket.key} - ${ticket.summary}</span>
                <span>
                    <span class="jira-item__date">${new Date(ticket.created).toLocaleString()}</span>
                </span>
            </a>
        `;
        ticketContainer.appendChild(ticketElement);
    });
  }
  
  // Logica del Connect Jira
  connectButton.addEventListener('click', () => {
    console.log("Dio click en connect")
    // Obtener los valores de jiraServerUrl y pat desde chrome.storage.local
    chrome.storage.local.get(['jiraServerUrl', 'pat'], (data) => {
      const jiraServerUrl = data.jiraServerUrl;
      const pat = data.pat;
      console.log("Jira URL: ", jiraServerUrl);
      console.log("Pat: ", pat);

      if (jiraServerUrl && pat) {
        // Enviar mensaje a background.js para probar la conexión
        chrome.runtime.sendMessage(
          {
            action: 'testConnection',
            jiraServerUrl: jiraServerUrl,
            pat: pat
          },
          (response) => {
            console.log("response");
            console.log(response);
            // Si ya existe una imagen previa, elimínala
            const existingStatusImg = plusDownloadContainer.querySelector('.connect_status');
            if (existingStatusImg) {
                existingStatusImg.remove();
            }

            // Crear el nuevo elemento de imagen
            const statusImg = document.createElement('img');
            statusImg.className = 'connect_status';

            // Según el resultado, asigna el ícono adecuado
            if (response.success) {
                statusImg.src = './icons/check.png';
            } else {
                statusImg.src = './icons/remove.png';
            }

            // Agregar la imagen al contenedor
            plusDownloadContainer.appendChild(statusImg);
          }
        );
      } else {
        // Mostrar error si no están configurados los valores
        alert("Please configure Jira Server URL and PAT first.");
      }
    });
  });

  // Cargar el valor guardado, si existe, y cambiar el estado a "Discard"
  chrome.storage.local.get('pat', (data) => {
    if (data.pat) {
      PatInput.value = data.pat;
      PatInput.disabled = true;
      buttonPatText.textContent = "Discard";
      // savePatButton.classList.add('button__discard');
    }
  });

  savePatButton.addEventListener('click', () => {
    if (buttonPatText.textContent === "Save") {
      // Guardar el valor en storage y cambiar a modo "Discard"
      const patValue = PatInput.value;
      if (patValue) {
        chrome.storage.local.set({ pat: patValue }, () => {
          PatInput.disabled = true;
          buttonPatText.textContent = "Discard";
          // savePatButton.classList.add('button__discard');
        });
      }
    } else {
      // En modo "Discard", limpiar el valor y cambiar a "Save"
      chrome.storage.local.remove('pat', () => {
        PatInput.disabled = false;
        PatInput.value = "";
        buttonPatText.textContent = "Save";
        // savePatButton.classList.remove('button__discard');
      });
    }
  });

  // Cargar el valor guardado, si existe, y cambiar el estado a "Discard"
  chrome.storage.local.get('jiraServerUrl', (data) => {
    if (data.jiraServerUrl) {
      jiraServerInput.value = data.jiraServerUrl;
      jiraServerInput.disabled = true;
      buttonJiraServerText.textContent = "Discard";
      // saveJiraServerButton.classList.add('button__discard');
    }
  });

  saveJiraServerButton.addEventListener('click', () => {
    if (buttonJiraServerText.textContent === "Save") {
      // Guardar el valor en storage y cambiar a modo "Discard"
      const jiraUrl = jiraServerInput.value.trim();
      if (jiraUrl) {
        chrome.storage.local.set({ jiraServerUrl: jiraUrl }, () => {
          jiraServerInput.disabled = true;
          buttonJiraServerText.textContent = "Discard";
          // saveJiraServerButton.classList.add('button__discard');
        });
      }
    } else {
      // En modo "Discard", limpiar el valor y cambiar a "Save"
      chrome.storage.local.remove('jiraServerUrl', () => {
        jiraServerInput.disabled = false;
        jiraServerInput.value = "";
        buttonJiraServerText.textContent = "Save";
        // saveJiraServerButton.classList.remove('button__discard');
      });
    }
  });
  
  // Manejo de tabs
  tabs.forEach(tab => {
      tab.addEventListener('click', () => {
          const index = tab.getAttribute('data-i18n');
          
          // Quita la clase 'tab--active' de todas las tabs y añade 'tab-item--hidden' a todas las tab items
          tabs.forEach(t => t.classList.remove('tab--active'));
          tabItems.forEach(item => item.classList.add('tab-item--hidden'));
          
          // Agrega 'tab--active' a la tab clicada y muestra el tab item correspondiente
          tab.classList.add('tab--active');
          
          console.log("tabItems");
          console.log(tabItems);
          console.log("tabItems[index]");
          console.log(tabItems[index]);
          console.log("index");
          console.log(index);
          tabItems[index].classList.remove('tab-item--hidden');
    });
  });

  // Agregando comportamiento para que pueda abrir en otra pestaña los ticket de jira    
  jiraLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault(); // Evita el comportamiento predeterminado
      const url = link.getAttribute('href');
      chrome.tabs.create({ url: url }); // Abre la URL en una nueva pestaña
    });
  });

  // Cargar las consultas JQL existentes
  chrome.storage.local.get('jqls', (data) => {
      const jqls = data.jqls || [];
      jqls.forEach(jql => addJqlToList(jql));
  });

  // Agregar nueva JQL
  addJqlButton.addEventListener('click', () => {
      console.log("click Save!!!");
      const newJql = jqlInput.value.trim();
      console.log("jql value: ", newJql);
      if (newJql) {
          // Agregar a storage
          chrome.storage.local.get('jqls', (data) => {
              const jqls = data.jqls || [];
              jqls.push(newJql);
              chrome.storage.local.set({ jqls }, () => {
                  addJqlToList(newJql);
                  jqlInput.value = ''; // Limpiar el campo de entrada
              });
          });

          // Mandar mensaje al service worker
          chrome.runtime.sendMessage(
            {
              action: 'addJQL',
              jql: newJql
            },
            (response) => {
              console.log("response adding JQL", response);
              console.log(response);
            }
          );
      }
  });

  // Eliminar JQL
  function removeJql(jql) {
      chrome.storage.local.get('jqls', (data) => {
          const jqls = data.jqls || [];
          const index = jqls.indexOf(jql);
          if (index > -1) {
              jqls.splice(index, 1);
              chrome.storage.local.set({ jqls }, () => {
                  updateJqlList();
              });
          }
      });

      // Mandar mensaje al service worker
      chrome.runtime.sendMessage(
        {
          action: 'removeJQL',
          jql: jql
        },
        (response) => {
          console.log("response removing JQL", response);
          console.log(response);
        }
      );
  }

  // Actualizar lista de JQLs
  function updateJqlList() {
      jqlList.innerHTML = '';
      chrome.storage.local.get('jqls', (data) => {
          const jqls = data.jqls || [];
          jqls.forEach(jql => addJqlToList(jql));
      });
  }

  // Agregar JQL a la lista visual y crear botón de eliminar
  function addJqlToList(jql) {
    const p = document.createElement('p');
    
    // Crear el <span> con el JQL
    const span = document.createElement('span');
    span.textContent = jql;
    span.setAttribute('data-i18n', 'plusMessage');
    p.appendChild(span);
    
    // Crear el <div> con la clase "message__button button"
    const divButton = document.createElement('div');
    divButton.classList.add('message__button', 'button');
    
    // Crear el <a> con el botón de eliminar
    const link = document.createElement('a');
    link.classList.add('button__link');
    link.href = '#';  // Si no lleva a ningún lado, puedes dejarlo así

    // Crear el <span> dentro del botón
    const buttonText = document.createElement('span');
    buttonText.classList.add('button__text');
    buttonText.setAttribute('data-i18n', 'plusButton');
    buttonText.textContent = 'Remove';
    
    // Asignar el evento para eliminar el JQL
    link.addEventListener('click', (e) => {
        e.preventDefault();  // Evitar que el link navegue
        removeJql(jql);  // Llamar a la función para eliminar el JQL
    });
    
    // Añadir el <span> al <a> y el <a> al <div>
    link.appendChild(buttonText);
    divButton.appendChild(link);

    // Añadir el <div> al <p>
    p.appendChild(divButton);
    
    // Añadir el <p> al contenedor de la lista
    jqlList.appendChild(p);
  }


});
