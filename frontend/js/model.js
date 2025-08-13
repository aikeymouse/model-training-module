// This file handles the logic for the model info modal.

// Import pipeline configuration
import { PipelineConfig, PipelineExecutor } from './pipeline-config.js';

// Global pipeline configuration instance
let pipelineConfig = null;

// Notification System
function showNotification(message, type = 'info', duration = 5000) {
    const container = document.getElementById('mt-notification-container');
    if (!container) {
        console.warn('Notification container not found, falling back to console:', message);
        return;
    }

    const notification = document.createElement('div');
    notification.className = `mt-notification ${type}`;
    
    notification.innerHTML = `
        <div class="mt-notification-content">
            <div class="mt-notification-icon"></div>
            <div class="mt-notification-message">${message}</div>
        </div>
    `;

    // Add to container
    container.appendChild(notification);

    // Auto-remove after duration
    if (duration > 0) {
        setTimeout(() => {
            removeNotification(notification);
        }, duration);
    }

    return notification;
}

// Make showNotification globally available
window.showNotification = showNotification;

function removeNotification(notification) {
    if (notification && notification.parentNode) {
        notification.style.animation = 'slideOut 0.3s ease-out forwards';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }
}

let activeModelPath = '';
let models = []; // Store models at a higher scope

// Function to render the list of models
function renderModelList() {
    const modelListContainer = document.getElementById('mt-model-list-container');
    if (!modelListContainer) return;

    // Clear previous content
    modelListContainer.innerHTML = '';

    if (models && models.length > 0) {
        // First, find the best value for each metric
        const bestMetrics = { p: 0, r: 0, map50: 0, map50_95: 0 };
        models.forEach(model => {
            if (model.p > bestMetrics.p) bestMetrics.p = model.p;
            if (model.r > bestMetrics.r) bestMetrics.r = model.r;
            if (model.map50 > bestMetrics.map50) bestMetrics.map50 = model.map50;
            if (model.map50_95 > bestMetrics.map50_95) bestMetrics.map50_95 = model.map50_95;
        });

        const modelList = document.createElement('div');
        modelList.className = 'mt-model-list'; // Add a class for styling
        models.forEach(model => {
            const modelItem = document.createElement('div');
            modelItem.className = 'mt-model-item'; // Add a class for styling
            const lastModified = new Date(model.last_modified * 1000).toLocaleString();
            
            // Format the metrics if they exist
            let metricsHTML = '';
            if (model.p > 0 || model.r > 0 || model.map50 > 0 || model.map50_95 > 0) {
                const pTitle = "P (Precision): When the model predicts a target, it is correct. A high value indicates very few false positives.";
                const rTitle = "R (Recall): The model successfully found a high percentage of all actual targets. A high value indicates the model rarely misses a target.";
                const map50Title = "mAP50: Mean Average Precision with a lenient 50% overlap requirement. Shows the model is extremely good at detecting the target.";
                const map50_95Title = "mAP50-95: The main metric. Average precision over strict overlap requirements (from 50% to 95%). Proves the model places the bounding box with very high accuracy.";

                const pStar = model.p === bestMetrics.p ? '⭐' : '';
                const rStar = model.r === bestMetrics.r ? '⭐' : '';
                const map50Star = model.map50 === bestMetrics.map50 ? '⭐' : '';
                const map50_95Star = model.map50_95 === bestMetrics.map50_95 ? '⭐' : '';

                metricsHTML = `
                    <span class="mt-model-metrics">
                        <small>
                            <b title="${pTitle}">P:</b> ${model.p.toFixed(3)}${pStar} | 
                            <b title="${rTitle}">R:</b> ${model.r.toFixed(3)}${rStar} | 
                            <b title="${map50Title}">mAP50:</b> ${model.map50.toFixed(3)}${map50Star} | 
                            <b title="${map50_95Title}">mAP50-95:</b> ${model.map50_95.toFixed(3)}${map50_95Star}
                        </small>
                    </span>
                `;
            }

            // Create tooltip text that guides users to the info icon for details
            const tooltipText = model.has_report 
                ? `${model.path} - Click the info icon (i) to view detailed training report`
                : `${model.path} - No detailed report available`;
            
            // Determine if this model is active based on pipeline configuration or backend config
            let isActive = false;
            if (pipelineConfig && pipelineConfig.config && pipelineConfig.config.pipeline) {
                const selectedModelVarRef = pipelineConfig.config.pipeline.selected_model_variable_reference;
                if (selectedModelVarRef && pipelineConfig.config.pipeline.variables && pipelineConfig.config.pipeline.variables[selectedModelVarRef]) {
                    const pipelineSelectedModel = pipelineConfig.config.pipeline.variables[selectedModelVarRef].default;
                    isActive = (model.path === pipelineSelectedModel);
                }
            }
            
            // Fallback to activeModelPath if no pipeline config
            if (!isActive && activeModelPath) {
                isActive = activeModelPath.endsWith(model.path);
            }
            
            const selectButtonHTML = isActive
                ? `<button class="mt-selected-model-btn" disabled>Selected</button>`
                : `<button class="mt-select-model-btn" title="Select" data-model-path="${model.path}">Select</button>`;

            const deleteContainerHTML = `
                <div class="mt-delete-container">
                    <button class="mt-delete-model-btn" title="Delete" data-model-path="${model.path}" ${isActive ? 'disabled' : ''}>Delete</button>
                    <div class="mt-confirm-cancel-container" style="display: none;">
                        <button class="mt-confirm-delete-btn" title="Confirm" data-model-path="${model.path}">✔</button>
                        <button class="mt-cancel-delete-btn" title="Cancel">✖</button>
                    </div>
                </div>`;

            modelItem.innerHTML = `
                <div class="mt-model-details">
                    <div class="mt-model-path-container">
                        <span class="mt-model-path" title="${tooltipText}"><b>${model.path}</b></span>
                        ${model.has_report ? `<button class="mt-info-icon" title="View Training Report" data-model-path="${model.path}">i</button>` : ''}
                    </div>
                    ${metricsHTML}
                    <br>
                    <span class="mt-model-date"><small>Last Modified: ${lastModified}</small></span>
                </div>
                <div class="mt-model-actions">
                    ${selectButtonHTML}
                    ${deleteContainerHTML}
                </div>
            `;
            modelList.appendChild(modelItem);
        });
        modelListContainer.appendChild(modelList);

        // Add event listeners to the new "Select" buttons
        modelListContainer.querySelectorAll('.mt-select-model-btn').forEach(button => {
            button.addEventListener('click', async (event) => {
                const modelPath = event.target.dataset.modelPath;
                
                try {
                    // Show loading state
                    event.target.textContent = 'Loading...';
                    event.target.disabled = true;
                    
                    // Load the model for testing via new API
                    const loadResponse = await fetch('/api/model/load', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ path: modelPath }),
                    });
                    
                    if (!loadResponse.ok) {
                        throw new Error(`Failed to load model: ${loadResponse.status}`);
                    }
                    
                    const loadResult = await loadResponse.json();
                    
                    // Update the pipeline configuration if reference exists
                    if (pipelineConfig && pipelineConfig.config && pipelineConfig.config.pipeline) {
                        const selectedModelVarRef = pipelineConfig.config.pipeline.selected_model_variable_reference;
                        if (selectedModelVarRef && pipelineConfig.config.pipeline.variables && pipelineConfig.config.pipeline.variables[selectedModelVarRef]) {
                            // Update the referenced variable's default value
                            pipelineConfig.config.pipeline.variables[selectedModelVarRef].default = modelPath;
                            
                            // Save the updated configuration
                            try {
                                const response = await fetch('/api/pipeline/save', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify(pipelineConfig.config),
                                });
                                
                                if (response.ok) {
                                    showNotification(`Model "${modelPath}" selected and loaded for testing (${loadResult.load_time}s)`, 'success');
                                }
                            } catch (saveError) {
                                console.error('Error saving pipeline configuration:', saveError);
                                showNotification('Warning: Model selected but pipeline configuration not saved', 'warning');
                            }
                        }
                    } else {
                        showNotification(`Model "${modelPath}" loaded for testing (${loadResult.load_time}s)`, 'success');
                    }
                    
                    // Update active model path and re-render the list
                    const currentBasePath = activeModelPath.substring(0, activeModelPath.lastIndexOf('/') + 1);
                    activeModelPath = currentBasePath + modelPath;
                    renderModelList();
                    
                    // Enable Test Model button
                    updateTestModelButtonState();
                    
                } catch (error) {
                    console.error('Error selecting model:', error);
                    showNotification(`Error selecting model: ${error.message}`, 'error');
                    
                    // Reset button state
                    event.target.textContent = 'Select';
                    event.target.disabled = false;
                }
            });
        });

        // Add event listeners for delete functionality
        modelListContainer.querySelectorAll('.mt-delete-model-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const deleteContainer = event.target.closest('.mt-delete-container');
                if (deleteContainer) {
                    deleteContainer.querySelector('.mt-delete-model-btn').style.display = 'none';
                    const confirmCancelContainer = deleteContainer.querySelector('.mt-confirm-cancel-container');
                    confirmCancelContainer.style.display = 'flex';
                }
            });
        });

        modelListContainer.querySelectorAll('.mt-cancel-delete-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const deleteContainer = event.target.closest('.mt-delete-container');
                if (deleteContainer) {
                    deleteContainer.querySelector('.mt-delete-model-btn').style.display = 'block';
                    deleteContainer.querySelector('.mt-confirm-cancel-container').style.display = 'none';
                }
            });
        });

        modelListContainer.querySelectorAll('.mt-confirm-delete-btn').forEach(button => {
            button.addEventListener('click', async (event) => {
                const modelPath = event.target.dataset.modelPath;
                try {
                    const response = await fetch(`/api/model/delete`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ name: modelPath }),
                    });
                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
                    }
                    const result = await response.json();
                    if (window.addLogMessage) {
                        window.addLogMessage(`Model ${modelPath} deleted: ${result.message}`);
                    }
                    // Fetch models again and re-render
                    const modelsResponse = await fetch('/api/models');
                    models = await modelsResponse.json();
                    renderModelList();
                } catch (error) {
                    console.error('Error deleting model:', error);
                    if (window.addLogMessage) {
                        window.addLogMessage(`Error deleting model: ${error.message}`);
                    }
                }
            });
        });

        // Add event listeners for info icons
        modelListContainer.querySelectorAll('.mt-info-icon').forEach(button => {
            button.addEventListener('click', (event) => {
                const modelPath = event.target.dataset.modelPath;
                openModelReportModal(modelPath);
            });
        });

    } else {
        // Create a styled no models message
        const noModelsDiv = document.createElement('div');
        noModelsDiv.className = 'mt-no-models-message';
        noModelsDiv.textContent = 'No models found';
        modelListContainer.appendChild(noModelsDiv);
    }
}

// Initialize pipeline configuration
async function initializePipelineConfig() {
    try {
        pipelineConfig = new PipelineConfig();
        
        // Try to load from server first, then fallback to static file
        let configLoaded = false;
        
        try {
            const serverResponse = await fetch('/api/pipeline/load');
            if (serverResponse.ok) {
                const serverConfig = await serverResponse.json();
                if (serverConfig && serverConfig.pipeline) {
                    pipelineConfig.config = serverConfig;
                    configLoaded = true;
                }
            }
        } catch (serverError) {
            // Fallback to static configuration file
        }
        
        // Fallback to static configuration file
        if (!configLoaded) {
            await pipelineConfig.loadConfig();
        }
        
        // Generate dynamic controls based on pipeline variables
        const dynamicControlsContainer = document.getElementById('mt-dynamic-controls');
        if (dynamicControlsContainer && pipelineConfig) {
            const controlsHTML = pipelineConfig.generateControlsHTML();
            dynamicControlsContainer.innerHTML = controlsHTML;
            
            // Add or remove empty class based on content
            if (controlsHTML.includes('empty-controls-placeholder')) {
                dynamicControlsContainer.classList.add('empty');
            } else {
                dynamicControlsContainer.classList.remove('empty');
            }
        }

        // Generate progress indicator based on pipeline stages
        const progressContainer = document.getElementById('mt-training-progress-indicator');
        if (progressContainer && pipelineConfig) {
            progressContainer.innerHTML = pipelineConfig.generateProgressHTML();
        }

    } catch (error) {
        console.error('Failed to load pipeline configuration:', error);
        showNotification('Failed to load pipeline configuration. Please check the configuration file.', 'error');
        
        // Show error in dynamic controls container
        const dynamicControlsContainer = document.getElementById('mt-dynamic-controls');
        if (dynamicControlsContainer) {
            dynamicControlsContainer.innerHTML = `
                <div style="color: red; padding: 20px; background-color: #ffebee; border: 2px solid #f44336; border-radius: 4px;">
                    <strong>Configuration Error:</strong> Failed to load pipeline configuration. 
                    Please ensure the configuration file is valid and accessible.
                </div>
            `;
        }
    }
}

// Open pipeline configuration modal
async function openPipelineConfigModal() {
    const pipelineConfigModal = document.getElementById('mt-pipeline-config-modal');
    if (!pipelineConfigModal) {
        console.error('Pipeline configuration modal not found');
        return;
    }

    // Ensure pipeline config is loaded
    if (!pipelineConfig) {
        await initializePipelineConfig();
    }

    // Populate the modal with current configuration
    populatePipelineConfigModal();
    
    // Show the modal
    pipelineConfigModal.style.display = 'flex';
}

// Populate pipeline configuration modal with current config
function populatePipelineConfigModal() {
    if (!pipelineConfig || !pipelineConfig.config) {
        console.error('No pipeline configuration available');
        return;
    }

    const stagesContainer = document.getElementById('mt-stages-container');
    const variablesContainer = document.getElementById('mt-variables-container');

    if (stagesContainer) {
        stagesContainer.innerHTML = generateStagesHTML();
    }

    if (variablesContainer) {
        variablesContainer.innerHTML = generateVariablesHTML();
    }

    // Add event listeners for the configuration buttons
    addPipelineConfigEventListeners();
}

// Generate HTML for pipeline stages
function generateStagesHTML() {
    if (!pipelineConfig || !pipelineConfig.config || !pipelineConfig.config.pipeline || !pipelineConfig.config.pipeline.stages) {
        return '<p>No stages configured</p>';
    }

    const stages = pipelineConfig.config.pipeline.stages;
    let html = '';

    stages.forEach((stage, index) => {
        html += `
            <div class="mt-stage-item" data-stage-index="${index}">
                <div class="mt-stage-header">
                    <h5>${stage.name} (${stage.id})</h5>
                    <div class="mt-stage-controls">
                        <label class="mt-stage-toggle">
                            <input type="checkbox" ${stage.enabled ? 'checked' : ''} data-stage-id="${stage.id}">
                            Enabled
                        </label>
                        <button class="mt-delete-stage-btn" title="Delete Stage" data-stage-id="${stage.id}" data-stage-name="${stage.name}">
                            ✖
                        </button>
                    </div>
                </div>
                <p class="mt-stage-description">${stage.description}</p>
                <div class="mt-stage-scripts">
                    <strong>Scripts:</strong>
                    <ul>
                        ${stage.scripts.map(script => `
                            <li>${script.script} ${script.args.join(' ')}</li>
                        `).join('')}
                    </ul>
                </div>
            </div>
        `;
    });

    return html;
}

// Generate HTML for pipeline variables
function generateVariablesHTML() {
    if (!pipelineConfig || !pipelineConfig.config || !pipelineConfig.config.pipeline || !pipelineConfig.config.pipeline.variables) {
        return '<p>No variables configured</p>';
    }

    const variables = pipelineConfig.config.pipeline.variables;
    let html = '';

    Object.keys(variables).forEach(key => {
        const variable = variables[key];
        const currentValue = pipelineConfig.getVariable(key);

        html += `
            <div class="mt-variable-item" data-variable-key="${key}">
                <div class="mt-variable-header">
                    <h5>${variable.label || key}</h5>
                    <div class="mt-variable-controls-header">
                        <span class="mt-variable-type">${variable.type}</span>
                        <label class="mt-variable-hidden-toggle">
                            <input type="checkbox" ${!variable.display_in_ui ? 'checked' : ''} data-variable-key="${key}">
                            Hidden
                        </label>
                        <button class="mt-delete-variable-btn" title="Delete Variable" data-variable-key="${key}" data-variable-label="${variable.label || key}">
                            ✖
                        </button>
                    </div>
                </div>
                <div class="mt-variable-input-controls">
                    ${generateVariableInput(key, variable, currentValue)}
                </div>
                ${variable.min !== undefined || variable.max !== undefined ? `
                    <div class="mt-variable-constraints">
                        ${variable.min !== undefined ? `Min: ${variable.min}` : ''}
                        ${variable.max !== undefined ? `Max: ${variable.max}` : ''}
                    </div>
                ` : ''}
                ${variable.options && variable.options.length > 0 ? `
                    <div class="mt-variable-constraints">
                        Options: ${variable.options.join(', ')}
                    </div>
                ` : ''}
            </div>
        `;
    });

    return html;
}

// Generate input for a specific variable
function generateVariableInput(key, variable, currentValue) {
    switch (variable.type) {
        case 'number':
            return `
                <input type="number" 
                       id="mt-var-${key}" 
                       value="${currentValue || variable.default || ''}" 
                       min="${variable.min || ''}" 
                       max="${variable.max || ''}"
                       data-variable-key="${key}">
            `;
        case 'text':
            return `
                <input type="text" 
                       id="mt-var-${key}" 
                       value="${currentValue || variable.default || ''}"
                       data-variable-key="${key}">
            `;
        case 'selector':
            // Selector with defined options
            const valueToSelect = currentValue || variable.default;
            return `
                <select id="mt-var-${key}" data-variable-key="${key}">
                    <option value="">Select an option...</option>
                    ${(variable.options || []).map(option => `
                        <option value="${option}" ${valueToSelect === option ? 'selected' : ''}>
                            ${option}
                        </option>
                    `).join('')}
                </select>
            `;
        default:
            return `
                <input type="text" 
                       id="mt-var-${key}" 
                       value="${currentValue || variable.default || ''}"
                       data-variable-key="${key}">
            `;
    }
}

// Add event listeners for pipeline configuration modal
function addPipelineConfigEventListeners() {
    // Save configuration
    const saveBtn = document.getElementById('mt-save-pipeline-config-btn');
    if (saveBtn) {
        saveBtn.onclick = savePipelineConfiguration;
    }

    // Load default configuration
    const loadDefaultBtn = document.getElementById('mt-load-default-config-btn');
    if (loadDefaultBtn) {
        loadDefaultBtn.onclick = loadDefaultConfiguration;
    }

    // Export configuration
    const exportBtn = document.getElementById('mt-export-config-btn');
    if (exportBtn) {
        exportBtn.onclick = exportConfiguration;
    }

    // Import configuration
    const importBtn = document.getElementById('mt-import-config-btn');
    const importInput = document.getElementById('mt-import-config-input');
    if (importBtn && importInput) {
        importBtn.onclick = () => importInput.click();
        importInput.onchange = importConfiguration;
    }

    // Add Stage button
    const addStageBtn = document.getElementById('mt-add-stage-btn');
    if (addStageBtn) {
        addStageBtn.onclick = showAddStageForm;
    }

    // Save Stage button
    const saveStageBtn = document.getElementById('mt-save-stage-btn');
    if (saveStageBtn) {
        saveStageBtn.onclick = saveNewStage;
    }

    // Cancel Stage button
    const cancelStageBtn = document.getElementById('mt-cancel-stage-btn');
    if (cancelStageBtn) {
        cancelStageBtn.onclick = hideAddStageForm;
    }

    // Add Variable button
    const addVariableBtn = document.getElementById('mt-add-variable-btn');
    if (addVariableBtn) {
        addVariableBtn.onclick = showAddVariableForm;
    }

    // Save Variable button
    const saveVariableBtn = document.getElementById('mt-save-variable-btn');
    if (saveVariableBtn) {
        saveVariableBtn.onclick = saveNewVariable;
    }

    // Cancel Variable button
    const cancelVariableBtn = document.getElementById('mt-cancel-variable-btn');
    if (cancelVariableBtn) {
        cancelVariableBtn.onclick = hideAddVariableForm;
    }

    // Variable type change handler
    const variableTypeSelect = document.getElementById('mt-variable-type-select');
    if (variableTypeSelect) {
        variableTypeSelect.onchange = handleVariableTypeChange;
    }

    // Variable value changes
    document.querySelectorAll('[data-variable-key]').forEach(input => {
        input.addEventListener('change', (e) => {
            const key = e.target.dataset.variableKey;
            const value = e.target.value;
            if (pipelineConfig) {
                pipelineConfig.setVariable(key, value);
            }
        });
    });

    // Stage enable/disable
    document.querySelectorAll('[data-stage-id]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const stageId = e.target.dataset.stageId;
            const enabled = e.target.checked;
            updateStageEnabled(stageId, enabled);
        });
    });

    // Delete stage buttons
    document.querySelectorAll('.mt-delete-stage-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const stageId = e.target.dataset.stageId;
            const stageName = e.target.dataset.stageName;
            deleteStage(stageId, stageName);
        });
    });

    // Delete variable buttons
    document.querySelectorAll('.mt-delete-variable-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const variableKey = e.target.dataset.variableKey;
            const variableLabel = e.target.dataset.variableLabel;
            deleteVariable(variableKey, variableLabel);
        });
    });

    // Variable hidden toggle
    document.querySelectorAll('.mt-variable-hidden-toggle input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', async (e) => {
            const variableKey = e.target.dataset.variableKey;
            const isHidden = e.target.checked;
            await updateVariableVisibility(variableKey, !isHidden);
        });
    });
}

// Show the add stage form
function showAddStageForm() {
    const form = document.getElementById('mt-add-stage-form');
    const addBtn = document.getElementById('mt-add-stage-btn');
    
    if (form && addBtn) {
        form.style.display = 'block';
        addBtn.style.display = 'none';
        
        // Clear form fields
        clearAddStageForm();
        
        // Focus on the first input
        const firstInput = document.getElementById('mt-stage-id-input');
        if (firstInput) {
            firstInput.focus();
        }
    }
}

// Hide the add stage form
function hideAddStageForm() {
    const form = document.getElementById('mt-add-stage-form');
    const addBtn = document.getElementById('mt-add-stage-btn');
    
    if (form && addBtn) {
        form.style.display = 'none';
        addBtn.style.display = 'block';
        clearAddStageForm();
    }
}

// Clear the add stage form
function clearAddStageForm() {
    document.getElementById('mt-stage-id-input').value = '';
    document.getElementById('mt-stage-name-input').value = '';
    document.getElementById('mt-stage-description-input').value = '';
    document.getElementById('mt-stage-script-input').value = '';
    document.getElementById('mt-stage-args-input').value = '';
    document.getElementById('mt-stage-enabled-input').checked = true;
    document.getElementById('mt-stage-optional-input').checked = false;
}

// Save new stage
function saveNewStage() {
    const stageId = document.getElementById('mt-stage-id-input').value.trim();
    const stageName = document.getElementById('mt-stage-name-input').value.trim();
    const stageDescription = document.getElementById('mt-stage-description-input').value.trim();
    const stageScript = document.getElementById('mt-stage-script-input').value.trim();
    const stageArgsText = document.getElementById('mt-stage-args-input').value.trim();
    const stageEnabled = document.getElementById('mt-stage-enabled-input').checked;
    const stageOptional = document.getElementById('mt-stage-optional-input').checked;

    // Validate required fields
    if (!stageId || !stageName || !stageDescription || !stageScript) {
        showNotification('Please fill in all required fields (ID, Name, Description, Script Path)', 'error');
        return;
    }

    // Check if stage ID already exists
    if (pipelineConfig && pipelineConfig.config && pipelineConfig.config.pipeline && pipelineConfig.config.pipeline.stages) {
        const existingStage = pipelineConfig.config.pipeline.stages.find(s => s.id === stageId);
        if (existingStage) {
            showNotification(`Stage with ID "${stageId}" already exists. Please use a different ID.`, 'error');
            return;
        }
    }

    // Parse arguments
    const stageArgs = stageArgsText ? stageArgsText.split(',').map(arg => arg.trim()).filter(arg => arg) : [];

    // Create new stage object
    const newStage = {
        id: stageId,
        name: stageName,
        description: stageDescription,
        scripts: [
            {
                script: stageScript,
                args: stageArgs
            }
        ],
        enabled: stageEnabled,
        optional: stageOptional
    };

    // Add to pipeline configuration
    if (pipelineConfig && pipelineConfig.config && pipelineConfig.config.pipeline) {
        if (!pipelineConfig.config.pipeline.stages) {
            pipelineConfig.config.pipeline.stages = [];
        }
        pipelineConfig.config.pipeline.stages.push(newStage);

        // Refresh the stages display
        populatePipelineConfigModal();
        
        // Hide the form
        hideAddStageForm();

        showNotification(`Stage "${stageName}" added successfully!`, 'success');
    } else {
        showNotification('Error: Pipeline configuration not available', 'error');
    }
}

// Show the add variable form
function showAddVariableForm() {
    const form = document.getElementById('mt-add-variable-form');
    const addBtn = document.getElementById('mt-add-variable-btn');
    
    if (form && addBtn) {
        form.style.display = 'block';
        addBtn.style.display = 'none';
        
        // Clear form fields
        clearAddVariableForm();
        
        // Focus on the first input
        const firstInput = document.getElementById('mt-variable-key-input');
        if (firstInput) {
            firstInput.focus();
        }
    }
}

// Hide the add variable form
function hideAddVariableForm() {
    const form = document.getElementById('mt-add-variable-form');
    const addBtn = document.getElementById('mt-add-variable-btn');
    
    if (form && addBtn) {
        form.style.display = 'none';
        addBtn.style.display = 'block';
        clearAddVariableForm();
    }
}

// Clear the add variable form
function clearAddVariableForm() {
    document.getElementById('mt-variable-key-input').value = '';
    document.getElementById('mt-variable-label-input').value = '';
    document.getElementById('mt-variable-type-select').value = '';
    document.getElementById('mt-variable-default-input').value = '';
    document.getElementById('mt-variable-min-input').value = '';
    document.getElementById('mt-variable-max-input').value = '';
    document.getElementById('mt-variable-options-input').value = '';
    document.getElementById('mt-variable-display-input').checked = false;
    
    // Hide type-specific constraints
    const numberConstraints = document.getElementById('mt-number-constraints');
    const selectorOptions = document.getElementById('mt-selector-options');
    if (numberConstraints) {
        numberConstraints.style.display = 'none';
    }
    if (selectorOptions) {
        selectorOptions.style.display = 'none';
    }
}

// Handle variable type change
function handleVariableTypeChange() {
    const typeSelect = document.getElementById('mt-variable-type-select');
    const numberConstraints = document.getElementById('mt-number-constraints');
    const selectorOptions = document.getElementById('mt-selector-options');
    const defaultInput = document.getElementById('mt-variable-default-input');
    
    if (typeSelect && numberConstraints && selectorOptions && defaultInput) {
        const selectedType = typeSelect.value;
        
        // Hide all type-specific sections first
        numberConstraints.style.display = 'none';
        selectorOptions.style.display = 'none';
        
        if (selectedType === 'number') {
            numberConstraints.style.display = 'flex';
            defaultInput.type = 'number';
            defaultInput.placeholder = 'e.g., 32';
        } else if (selectedType === 'selector') {
            selectorOptions.style.display = 'flex';
            defaultInput.type = 'text';
            defaultInput.placeholder = 'e.g., option1';
        } else {
            defaultInput.type = 'text';
            if (selectedType === 'text') {
                defaultInput.placeholder = 'e.g., default_value';
            } else {
                defaultInput.placeholder = '';
            }
        }
    }
}

// Save new variable
function saveNewVariable() {
    const variableKey = document.getElementById('mt-variable-key-input').value.trim();
    const variableLabel = document.getElementById('mt-variable-label-input').value.trim();
    const variableType = document.getElementById('mt-variable-type-select').value;
    const variableDefault = document.getElementById('mt-variable-default-input').value.trim();
    const variableMin = document.getElementById('mt-variable-min-input').value;
    const variableMax = document.getElementById('mt-variable-max-input').value;
    const variableOptions = document.getElementById('mt-variable-options-input').value.trim();
    const variableHidden = document.getElementById('mt-variable-display-input').checked;

    // Validate required fields
    if (!variableKey || !variableLabel || !variableType) {
        showNotification('Please fill in all required fields (Key, Label, Type)', 'error');
        return;
    }

    // Additional validation for selector type
    if (variableType === 'selector' && !variableOptions) {
        showNotification('Please provide options for selector type (comma-separated)', 'error');
        return;
    }

    // Validate variable key format (alphanumeric and underscore only)
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(variableKey)) {
        showNotification('Variable key must start with a letter or underscore and contain only letters, numbers, and underscores', 'error');
        return;
    }

    // Check if variable key already exists
    if (pipelineConfig && pipelineConfig.config && pipelineConfig.config.pipeline && pipelineConfig.config.pipeline.variables) {
        const existingVariable = pipelineConfig.config.pipeline.variables[variableKey];
        if (existingVariable) {
            showNotification(`Variable with key "${variableKey}" already exists. Please use a different key.`, 'error');
            return;
        }
    }

    // Create new variable object
    const newVariable = {
        type: variableType,
        label: variableLabel
    };

    // Add default value if provided
    if (variableDefault) {
        if (variableType === 'number') {
            newVariable.default = parseFloat(variableDefault) || 0;
        } else {
            newVariable.default = variableDefault;
        }
    }

    // Add constraints for number type
    if (variableType === 'number') {
        if (variableMin !== '') {
            newVariable.min = parseFloat(variableMin);
        }
        if (variableMax !== '') {
            newVariable.max = parseFloat(variableMax);
        }
    }

    // Add options for selector type
    if (variableType === 'selector' && variableOptions) {
        newVariable.options = variableOptions.split(',').map(option => option.trim()).filter(option => option);
    }

    // Add display_in_ui flag (inverted from hidden checkbox)
    newVariable.display_in_ui = !variableHidden;

    // Add to pipeline configuration
    if (pipelineConfig && pipelineConfig.config && pipelineConfig.config.pipeline) {
        if (!pipelineConfig.config.pipeline.variables) {
            pipelineConfig.config.pipeline.variables = {};
        }
        pipelineConfig.config.pipeline.variables[variableKey] = newVariable;

        // Initialize the variable with its default value
        if (newVariable.default !== undefined) {
            pipelineConfig.setVariable(variableKey, newVariable.default);
        }

        // Refresh the variables display
        populatePipelineConfigModal();
        
        // Hide the form
        hideAddVariableForm();

        showNotification(`Variable "${variableLabel}" added successfully!`, 'success');
    } else {
        showNotification('Error: Pipeline configuration not available', 'error');
    }
}

// Save pipeline configuration
async function savePipelineConfiguration() {
    if (!pipelineConfig || !pipelineConfig.config) {
        console.error('No configuration to save');
        showNotification('Error: No configuration to save', 'error');
        return;
    }

    try {
        // Show saving status
        const saveBtn = document.getElementById('mt-save-pipeline-config-btn');
        const originalText = saveBtn ? saveBtn.textContent : '';
        if (saveBtn) {
            saveBtn.textContent = 'Saving...';
            saveBtn.disabled = true;
        }

        // Save configuration to server
        const response = await fetch('/api/pipeline/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(pipelineConfig.config),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const result = await response.json();
        
        // Update the dynamic controls in the main modal
        const dynamicControlsContainer = document.getElementById('mt-dynamic-controls');
        if (dynamicControlsContainer && pipelineConfig) {
            dynamicControlsContainer.innerHTML = pipelineConfig.generateControlsHTML();
        }

        // Update progress indicator in main modal
        const progressContainer = document.getElementById('mt-training-progress-indicator');
        if (progressContainer && pipelineConfig) {
            progressContainer.innerHTML = pipelineConfig.generateProgressHTML();
        }

        showNotification('Configuration saved successfully to server!', 'success');

    } catch (error) {
        console.error('Error saving pipeline configuration:', error);
        showNotification(`Error saving configuration: ${error.message}`, 'error');
    } finally {
        // Restore button state
        const saveBtn = document.getElementById('mt-save-pipeline-config-btn');
        if (saveBtn) {
            saveBtn.textContent = 'Save Configuration';
            saveBtn.disabled = false;
        }
    }
}

// Load default configuration
async function loadDefaultConfiguration() {
    if (pipelineConfig) {
        pipelineConfig.config = pipelineConfig.getDefaultConfig();
        pipelineConfig.initializeVariables();
        populatePipelineConfigModal();
    }
}

// Export configuration
function exportConfiguration() {
    if (!pipelineConfig || !pipelineConfig.config) {
        console.error('No configuration to export');
        return;
    }

    const configStr = JSON.stringify(pipelineConfig.config, null, 2);
    const blob = new Blob([configStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'training-pipeline.json';
    a.click();
    
    URL.revokeObjectURL(url);
}

// Import configuration
function importConfiguration(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const config = JSON.parse(e.target.result);
            if (pipelineConfig) {
                pipelineConfig.config = config;
                pipelineConfig.initializeVariables();
                populatePipelineConfigModal();
            }
        } catch (error) {
            console.error('Error importing configuration:', error);
            showNotification('Error importing configuration: Invalid JSON file', 'error');
        }
    };
    reader.readAsText(file);
}

// Update stage enabled status
function updateStageEnabled(stageId, enabled) {
    if (!pipelineConfig || !pipelineConfig.config || !pipelineConfig.config.pipeline || !pipelineConfig.config.pipeline.stages) {
        return;
    }

    const stage = pipelineConfig.config.pipeline.stages.find(s => s.id === stageId);
    if (stage) {
        stage.enabled = enabled;
    }
}

// Update variable visibility
async function updateVariableVisibility(variableKey, displayInUI) {
    if (!pipelineConfig || !pipelineConfig.config || !pipelineConfig.config.pipeline || !pipelineConfig.config.pipeline.variables) {
        return;
    }

    const variable = pipelineConfig.config.pipeline.variables[variableKey];
    if (variable) {
        variable.display_in_ui = displayInUI;
        
        // Update the dynamic controls in the main modal
        const dynamicControlsContainer = document.getElementById('mt-dynamic-controls');
        if (dynamicControlsContainer && pipelineConfig) {
            dynamicControlsContainer.innerHTML = pipelineConfig.generateControlsHTML();
        }
        
        // Refresh the pipeline configuration modal to show updated checkbox state
        populatePipelineConfigModal();
    }
}

// Delete a stage
function deleteStage(stageId, stageName) {
    if (!pipelineConfig || !pipelineConfig.config || !pipelineConfig.config.pipeline || !pipelineConfig.config.pipeline.stages) {
        return;
    }

    // Find and remove the stage
    const stages = pipelineConfig.config.pipeline.stages;
    const stageIndex = stages.findIndex(s => s.id === stageId);
    
    if (stageIndex !== -1) {
        stages.splice(stageIndex, 1);
        
        // Refresh the display
        populatePipelineConfigModal();
        
        showNotification(`Stage "${stageName}" deleted successfully!`, 'success');
    } else {
        showNotification(`Error: Stage "${stageId}" not found.`, 'error');
    }
}

// Delete a variable
function deleteVariable(variableKey, variableLabel) {
    if (!pipelineConfig || !pipelineConfig.config || !pipelineConfig.config.pipeline || !pipelineConfig.config.pipeline.variables) {
        return;
    }

    // Check if variable is used in any stage
    const usedInStages = [];
    if (pipelineConfig.config.pipeline.stages) {
        pipelineConfig.config.pipeline.stages.forEach(stage => {
            stage.scripts.forEach(script => {
                script.args.forEach(arg => {
                    if (typeof arg === 'string' && arg.includes(`{${variableKey}}`)) {
                        usedInStages.push(stage.name);
                    }
                });
            });
        });
    }

    // Remove the variable
    delete pipelineConfig.config.pipeline.variables[variableKey];
    
    // Remove from variables object
    if (pipelineConfig.variables && pipelineConfig.variables[variableKey] !== undefined) {
        delete pipelineConfig.variables[variableKey];
    }
    
    // Refresh the display
    populatePipelineConfigModal();
    
    showNotification(`Variable "${variableLabel}" deleted successfully!`, 'success');
}

// Validate pipeline configuration
function validatePipelineConfiguration(pipelineConfig) {
    const errors = [];
    
    if (!pipelineConfig || !pipelineConfig.config || !pipelineConfig.config.pipeline) {
        return { isValid: false, errors: ['Pipeline configuration is missing or invalid'] };
    }
    
    const config = pipelineConfig.config.pipeline;
    const variables = config.variables || {};
    const stages = config.stages || [];
    
    // Collect all variable references from enabled stages
    const referencedVariables = new Set();
    
    stages.forEach(stage => {
        if (stage.enabled && stage.scripts) {
            stage.scripts.forEach(script => {
                if (script.args) {
                    script.args.forEach(arg => {
                        if (typeof arg === 'string') {
                            // Find variable references in the format {variable_name}
                            const matches = arg.match(/\{([^}]+)\}/g);
                            if (matches) {
                                matches.forEach(match => {
                                    const variableName = match.slice(1, -1); // Remove { and }
                                    referencedVariables.add(variableName);
                                });
                            }
                        }
                    });
                }
            });
        }
    });
    
    // Check if all referenced variables exist in configuration
    referencedVariables.forEach(varName => {
        if (!variables[varName]) {
            errors.push(`Variable "${varName}" is referenced in pipeline stages but not defined in variables configuration`);
        } else {
            // Check if variable has required properties
            const variable = variables[varName];
            if (variable.type === undefined) {
                errors.push(`Variable "${varName}" is missing required "type" property`);
            }
            if (variable.default === undefined) {
                errors.push(`Variable "${varName}" is missing required "default" property`);
            }
        }
    });
    
    // Check for variables that are displayed in UI but don't have proper configurations
    Object.keys(variables).forEach(varName => {
        const variable = variables[varName];
        if (variable.display_in_ui) {
            if (!variable.label) {
                errors.push(`Variable "${varName}" is displayed in UI but missing "label" property`);
            }
            if (variable.type === 'number') {
                if (typeof variable.default !== 'number') {
                    errors.push(`Variable "${varName}" has type "number" but default value is not a number`);
                }
            }
            if (variable.type === 'selector') {
                if (!variable.options || !Array.isArray(variable.options)) {
                    errors.push(`Variable "${varName}" has type "selector" but missing or invalid "options" property`);
                }
            }
        }
    });
    
    // Check for stages without scripts
    stages.forEach(stage => {
        if (stage.enabled && (!stage.scripts || stage.scripts.length === 0)) {
            errors.push(`Stage "${stage.name}" (${stage.id}) is enabled but has no scripts configured`);
        }
    });
    
    return {
        isValid: errors.length === 0,
        errors: errors,
        referencedVariables: Array.from(referencedVariables)
    };
}

// Function to open the modal and fetch model data
export async function openModal() {
    const modelInfoModal = document.getElementById('mt-model-info-modal');
    const modelListContainer = document.getElementById('mt-model-list-container');

    if (!modelInfoModal || !modelListContainer) {
        console.error("Modal elements not found in the DOM");
        return;
    }

    try {
        // Ensure pipeline configuration is loaded
        if (!pipelineConfig) {
            await initializePipelineConfig();
        }

        // Fetch models
        const modelsResponse = await fetch('/api/models');
        if (!modelsResponse.ok) {
            throw new Error(`HTTP error fetching models! status: ${modelsResponse.status}`);
        }
        models = await modelsResponse.json();
        
        // Check if a model is actually loaded in the backend
        let selectedModel = '';
        let backendHasLoadedModel = false;
        try {
            const loadedModelResponse = await fetch('/api/model/loaded');
            if (loadedModelResponse.ok) {
                const loadedModelData = await loadedModelResponse.json();
                if (loadedModelData.loaded && loadedModelData.model_path) {
                    // Backend has a model loaded, use that
                    selectedModel = loadedModelData.model_path;
                    backendHasLoadedModel = true;
                }
            }
        } catch (error) {
            console.warn('Could not check backend loaded model:', error);
        }
        
        // If no model is loaded in backend, check pipeline configuration
        if (!selectedModel && pipelineConfig && pipelineConfig.config && pipelineConfig.config.pipeline) {
            const selectedModelVarRef = pipelineConfig.config.pipeline.selected_model_variable_reference;
            if (selectedModelVarRef && pipelineConfig.config.pipeline.variables && pipelineConfig.config.pipeline.variables[selectedModelVarRef]) {
                selectedModel = pipelineConfig.config.pipeline.variables[selectedModelVarRef].default || '';
            }
        }
        
        // Fallback to default model if no pipeline config available
        if (!selectedModel) {
            selectedModel = 'yolov8n.pt';
        }
        
        // Set active model path for rendering (use models directory path)
        // Only set if backend has a loaded model, otherwise clear it
        activeModelPath = backendHasLoadedModel ? `../training_service_python/models/${selectedModel}` : '';

        renderModelList(); // Render the content

        // Update Test Model button state
        updateTestModelButtonState();

        modelInfoModal.style.display = 'flex';
    } catch (error) {
        console.error('Error fetching models or config:', error);
        modelListContainer.textContent = 'Error loading models.';
        modelInfoModal.style.display = 'flex';
    }
}

// Function to close the modal
export function closeModal() {
    const modelInfoModal = document.getElementById('mt-model-info-modal');
    if (modelInfoModal) {
        modelInfoModal.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const modelInfoModal = document.getElementById('mt-model-info-modal');
    const closeButton = modelInfoModal ? modelInfoModal.querySelector('.mt-close-button') : null;
    const openModalButton = document.getElementById('mt-open-model-modal-btn');
    const configurePipelineBtn = document.getElementById('mt-configure-pipeline-btn');
    const testModelBtn = document.getElementById('mt-test-model-btn');
    
    if (closeButton) {
        closeButton.addEventListener('click', closeModal);
    }
    
    if (openModalButton) {
        openModalButton.addEventListener('click', openModal);
    }

    // Initialize pipeline configuration
    initializePipelineConfig();

    if (configurePipelineBtn) {
        configurePipelineBtn.addEventListener('click', openPipelineConfigModal);
    }
    
    if (testModelBtn) {
        testModelBtn.addEventListener('click', openTestModelModal);
        
        // Initially disable Test Model button
        updateTestModelButtonState();
    }

    const manageDatasetBtn = document.getElementById('mt-manage-dataset-btn');
    if (manageDatasetBtn) {
        manageDatasetBtn.addEventListener('click', openManageDatasetModal);
    }

    const trainModelBtn = document.getElementById('mt-train-model-btn');
        let currentExecutor = null; // Track the current pipeline executor for cancellation
        
        if (trainModelBtn) {
            trainModelBtn.addEventListener('click', async () => {
                // Check if we're currently training (cancel mode)
                if (trainModelBtn.classList.contains('cancel-mode')) {
                    // Cancel the current execution
                    if (currentExecutor) {
                        currentExecutor.cancel();
                        currentExecutor = null;
                    }
                    
                    // Reset button state
                    trainModelBtn.textContent = 'Train New Model';
                    trainModelBtn.classList.remove('cancel-mode');
                    trainModelBtn.disabled = false;
                    
                    // Re-enable configure pipeline button
                    if (configurePipelineBtn) {
                        configurePipelineBtn.disabled = false;
                    }
                    
                    // Re-enable manage dataset button
                    const manageDatasetBtn = document.getElementById('mt-manage-dataset-btn');
                    if (manageDatasetBtn) {
                        manageDatasetBtn.disabled = false;
                    }
                    
                    return;
                }
                
                // Start training mode
                trainModelBtn.textContent = 'Cancel Pipeline';
                trainModelBtn.classList.add('cancel-mode');
                trainModelBtn.disabled = false; // Keep enabled for cancellation
                
                // Disable configure pipeline button during training
                if (configurePipelineBtn) {
                    configurePipelineBtn.disabled = true;
                }
                
                // Disable manage dataset button during training
                const manageDatasetBtn = document.getElementById('mt-manage-dataset-btn');
                if (manageDatasetBtn) {
                    manageDatasetBtn.disabled = true;
                }

                const logContainer = document.getElementById('mt-script-log-container');
                logContainer.innerHTML = ''; // Clear previous logs
                
                // Reset any previous error styling
                logContainer.style.backgroundColor = '';
                logContainer.style.border = '';
                
                // Get progress steps
                const progressSteps = {
                    validate: document.getElementById('mt-validate-step'),
                    generate: document.getElementById('mt-generate-step'),
                    train: document.getElementById('mt-mt-train-step')
                };
                
                // Reset progress indicator and styling (including error styling)
                Object.values(progressSteps).forEach(step => {
                    if (step) {
                        step.classList.remove('active', 'completed');
                        step.style.backgroundColor = '';
                        step.style.borderColor = '';
                        step.style.color = '';
                    }
                });

                try {
                    // Validate pipeline configuration and execute
                    if (pipelineConfig && pipelineConfig.config && pipelineConfig.config.pipeline) {
                        // Validate pipeline configuration
                        const validationResult = validatePipelineConfiguration(pipelineConfig);
                        if (!validationResult.isValid) {
                            // Show error notification
                            showNotification(`Pipeline configuration error: ${validationResult.errors.join(', ')}`, 'error');
                            
                            // Display error in log container
                            logContainer.innerHTML += `<div style="color: red; font-weight: bold; font-size: 16px; margin: 20px 0;"><strong>Pipeline configuration error:</strong></div>`;
                            validationResult.errors.forEach(error => {
                                logContainer.innerHTML += `<div style="color: red; margin: 10px 0;">• ${error}</div>`;
                            });
                            
                            // Find and highlight problematic stages with red background
                            const stages = pipelineConfig.config.pipeline.stages || [];
                            const variables = pipelineConfig.config.pipeline.variables || {};
                            
                            stages.forEach(stage => {
                                if (stage.enabled && stage.scripts) {
                                    let stageHasError = false;
                                    
                                    stage.scripts.forEach(script => {
                                        if (script.args) {
                                            script.args.forEach(arg => {
                                                if (typeof arg === 'string') {
                                                    const matches = arg.match(/\{([^}]+)\}/g);
                                                    if (matches) {
                                                        matches.forEach(match => {
                                                            const variableName = match.slice(1, -1);
                                                            if (!variables[variableName]) {
                                                                stageHasError = true;
                                                            }
                                                        });
                                                    }
                                                }
                                            });
                                        }
                                    });
                                    
                                    // Apply red background to problematic stage
                                    if (stageHasError) {
                                        const stageElement = document.getElementById(`mt-${stage.id}-step`);
                                        if (stageElement) {
                                            stageElement.style.backgroundColor = '#ffebee';
                                            stageElement.style.borderColor = '#f44336';
                                            stageElement.style.color = '#d32f2f';
                                        }
                                    }
                                }
                            });
                            
                            throw new Error(`Pipeline configuration error: ${validationResult.errors.join(', ')}`);
                        }

                        // Collect and validate all required variables
                        const variables = pipelineConfig.config.pipeline.variables || {};
                        
                        // Update all pipeline variables with current values
                        Object.keys(variables).forEach(key => {
                            const variable = variables[key];
                            let value = variable.default;
                            
                            if (variable.display_in_ui) {
                                // Get value from UI element
                                const element = document.getElementById(`mt-var-${key}`);
                                if (element) {
                                    value = variable.type === 'number' ? 
                                        parseFloat(element.value) || variable.default : 
                                        element.value || variable.default;
                                }
                            } else {
                                // Use default value for hidden variables
                                value = variable.default;
                            }
                            
                            pipelineConfig.setVariable(key, value);
                        });
                        
                        // Set model_path from selected model if not already set
                        if (!activeModelPath) {
                            throw new Error("No model selected for fine-tuning. Please select a model from the list.");
                        }
                        const modelFilename = activeModelPath.split('/').pop();
                        const modelArg = `/app/models/${modelFilename}`;
                        pipelineConfig.setVariable('model_path', modelArg);

                        // Execute pipeline using PipelineExecutor
                        const executor = new PipelineExecutor(pipelineConfig, logContainer);
                        currentExecutor = executor; // Store reference for cancellation
                        executor.initializeProgressSteps();
                        await executor.executePipeline();
                        
                    } else {
                        throw new Error("Pipeline configuration is not available. Please ensure the configuration is properly loaded.");
                    }

                    // Pipeline completion message is handled by PipelineExecutor
            } catch (error) {
                console.error('Training pipeline failed:', error);
                
                // Show error notification
                showNotification(`Training pipeline failed: ${error.message}`, 'error');
                
                // Display error in log container (without changing its background)
                logContainer.innerHTML += `<div style="color: red; font-weight: bold; font-size: 16px; margin: 20px 0;"><strong>Training pipeline failed:</strong> ${error.message}</div>`;
                
                // Remove active class from all steps (safely)
                if (progressSteps.validate) progressSteps.validate.classList.remove('active');
                if (progressSteps.generate) progressSteps.generate.classList.remove('active');
                if (progressSteps.train) progressSteps.train.classList.remove('active');
            } finally {
                // Reset button state
                trainModelBtn.textContent = 'Train New Model';
                trainModelBtn.classList.remove('cancel-mode');
                trainModelBtn.disabled = false;
                currentExecutor = null; // Clear executor reference
                
                // Re-enable configure pipeline button after training
                if (configurePipelineBtn) {
                    configurePipelineBtn.disabled = false;
                }
                
                // Re-enable manage dataset button after training
                const manageDatasetBtn = document.getElementById('mt-manage-dataset-btn');
                if (manageDatasetBtn) {
                    manageDatasetBtn.disabled = false;
                }
                
                openModal(); // Refresh model list to show new model
            }
        });
    }

    // Close modal if user clicks outside of the modal content
    window.addEventListener('click', (event) => {
        if (event.target === modelInfoModal) {
            closeModal();
        }
    });

    // Close pipeline config modal if user clicks outside
    const pipelineConfigModal = document.getElementById('mt-pipeline-config-modal');
    if (pipelineConfigModal) {
        window.addEventListener('click', (event) => {
            if (event.target === pipelineConfigModal) {
                pipelineConfigModal.style.display = 'none';
            }
        });

        // Add close button listener for pipeline config modal
        const pipelineCloseButton = pipelineConfigModal.querySelector('.mt-close-button');
        if (pipelineCloseButton) {
            pipelineCloseButton.addEventListener('click', () => {
                pipelineConfigModal.style.display = 'none';
            });
        }
    }

    // Close model report modal if user clicks outside
    const modelReportModal = document.getElementById('mt-model-report-modal');
    if (modelReportModal) {
        window.addEventListener('click', (event) => {
            if (event.target === modelReportModal) {
                closeModelReportModal();
            }
        });
    }
    
    // Close test model modal if user clicks outside
    const testModelModal = document.getElementById('mt-test-model-modal');
    if (testModelModal) {
        window.addEventListener('click', (event) => {
            if (event.target === testModelModal) {
                closeTestModelModal();
            }
        });
    }
});

// Test Model Modal Functions
async function updateTestModelButtonState() {
    const testModelBtn = document.getElementById('mt-test-model-btn');
    if (!testModelBtn) return;
    
    try {
        const response = await fetch('/api/model/loaded');
        const data = await response.json();
        
        if (data.loaded) {
            testModelBtn.disabled = false;
            testModelBtn.title = `Test model: ${data.model_path}`;
        } else {
            testModelBtn.disabled = true;
            testModelBtn.title = 'Select a model first to enable testing';
        }
    } catch (error) {
        console.error('Error checking loaded model:', error);
        testModelBtn.disabled = true;
        testModelBtn.title = 'Error checking model status';
    }
}

async function openTestModelModal() {
    const modal = document.getElementById('mt-test-model-modal');
    if (!modal) {
        console.error('Test model modal not found');
        return;
    }
    
    // Check if a model is loaded
    try {
        const response = await fetch('/api/model/loaded');
        const data = await response.json();
        
        if (!data.loaded) {
            showNotification('Please select a model first to enable testing', 'warning');
            return;
        }
        
        // Update modal title to show loaded model
        const modalTitle = modal.querySelector('h3');
        if (modalTitle) {
            modalTitle.textContent = `Test Model: ${data.model_path}`;
        }
    } catch (error) {
        console.error('Error checking loaded model:', error);
        showNotification('Error checking model status', 'error');
        return;
    }
    
    // Reset form
    resetTestModelForm();
    
    // Load confidence threshold from pipeline config
    await loadConfidenceThreshold();
    
    // Show the modal
    modal.style.display = 'flex';
    
    // Set up event listeners for this modal
    setupTestModelEventListeners();
}

function closeTestModelModal() {
    const modal = document.getElementById('mt-test-model-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    // Reset form
    resetTestModelForm();
}

function resetTestModelForm() {
    // Reset image upload
    const imageInput = document.getElementById('mt-test-image-input');
    const imagePreview = document.getElementById('mt-selected-image-preview');
    const uploadArea = document.getElementById('mt-file-upload-area');
    const resultImageContainer = document.getElementById('mt-result-image-container');
    const combinedImageArea = document.getElementById('mt-combined-image-area');
    
    if (imageInput) {
        imageInput.value = '';
    }
    
    if (imagePreview) {
        imagePreview.style.display = 'none';
    }
    
    if (uploadArea) {
        uploadArea.style.display = 'block';
    }
    
    if (resultImageContainer) {
        resultImageContainer.style.display = 'none';
    }
    
    // Remove has-content class to restore dashed border
    if (combinedImageArea) {
        combinedImageArea.classList.remove('has-content');
    }
    
    // Reset test button
    const testBtn = document.getElementById('mt-run-test-btn');
    if (testBtn) {
        testBtn.disabled = true;
        testBtn.textContent = 'Detect';
        testBtn.classList.remove('loading', 'reset');
    }
    
    // Reset detection results to default message
    const resultsContent = document.getElementById('mt-test-results-content');
    if (resultsContent) {
        resultsContent.innerHTML = '<p class="mt-no-results">Select an image and click Detect to see results</p>';
    }
}

async function loadTestModelOptions() {
    const modelSelect = document.getElementById('mt-test-model-select');
    if (!modelSelect) return;
    
    try {
        const response = await fetch('/api/models');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const models = await response.json();
        
        // Clear existing options except the first one
        modelSelect.innerHTML = '<option value="">Choose a trained model...</option>';
        
        // Add model options
        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.path;
            option.textContent = `${model.name} (${model.size}, ${model.created})`;
            modelSelect.appendChild(option);
        });
        
        // Pre-select the currently active model if one is selected
        if (activeModelPath) {
            modelSelect.value = activeModelPath;
            checkTestReadiness(); // Check if we can enable the test button
        }
        
    } catch (error) {
        console.error('Error loading models:', error);
        showNotification('Error loading model list', 'error');
    }
}

function setupTestModelEventListeners() {
    const modelSelect = document.getElementById('mt-test-model-select');
    const imageInput = document.getElementById('mt-test-image-input');
    const uploadArea = document.getElementById('mt-file-upload-area');
    const testBtn = document.getElementById('mt-run-test-btn');
    
    // Model selection handler
    if (modelSelect) {
        modelSelect.removeEventListener('change', handleModelSelection); // Remove if exists
        modelSelect.addEventListener('change', handleModelSelection);
    }
    
    // File upload handlers
    if (imageInput) {
        imageInput.removeEventListener('change', handleImageSelection);
        imageInput.addEventListener('change', handleImageSelection);
    }
    
    if (uploadArea) {
        // Remove existing listeners
        uploadArea.removeEventListener('click', triggerFileSelection);
        uploadArea.removeEventListener('dragover', handleDragOver);
        uploadArea.removeEventListener('dragleave', handleDragLeave);
        uploadArea.removeEventListener('drop', handleDrop);
        
        // Add new listeners
        uploadArea.addEventListener('click', triggerFileSelection);
        uploadArea.addEventListener('dragover', handleDragOver);
        uploadArea.addEventListener('dragleave', handleDragLeave);
        uploadArea.addEventListener('drop', handleDrop);
    }
    
    // Test button handler
    if (testBtn) {
        testBtn.removeEventListener('click', runModelTest);
        testBtn.addEventListener('click', runModelTest);
    }
    
    // Confidence threshold change handler
    const confidenceInput = document.getElementById('mt-confidence-threshold-input');
    if (confidenceInput) {
        confidenceInput.removeEventListener('change', saveConfidenceThreshold);
        confidenceInput.addEventListener('change', saveConfidenceThreshold);
        confidenceInput.removeEventListener('input', saveConfidenceThreshold);
        confidenceInput.addEventListener('input', saveConfidenceThreshold);
    }
}

async function loadConfidenceThreshold() {
    try {
        const response = await fetch('/api/pipeline/load');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const config = await response.json();
        const confidenceThreshold = config?.pipeline?.confidence_threshold || 0.25;
        
        const confidenceInput = document.getElementById('mt-confidence-threshold-input');
        if (confidenceInput) {
            confidenceInput.value = confidenceThreshold;
        }
    } catch (error) {
        console.error('Error loading confidence threshold:', error);
        // Use default value if loading fails
        const confidenceInput = document.getElementById('mt-confidence-threshold-input');
        if (confidenceInput) {
            confidenceInput.value = 0.25;
        }
    }
}

async function saveConfidenceThreshold() {
    const confidenceInput = document.getElementById('mt-confidence-threshold-input');
    if (!confidenceInput) return;
    
    const value = parseFloat(confidenceInput.value);
    
    // Validate the value
    if (isNaN(value) || value < 0.01 || value > 1.0) {
        showNotification('Confidence threshold must be between 0.01 and 1.0', 'warning');
        confidenceInput.value = 0.25; // Reset to default
        return;
    }
    
    try {
        // Load current config
        const response = await fetch('/api/pipeline/load');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const config = await response.json();
        
        // Update confidence threshold at pipeline level
        if (!config.pipeline) config.pipeline = {};
        config.pipeline.confidence_threshold = value;
        
        // Save updated config
        const saveResponse = await fetch('/api/pipeline/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(config)
        });
        
        if (!saveResponse.ok) {
            throw new Error(`HTTP error! status: ${saveResponse.status}`);
        }
        
    } catch (error) {
        console.error('Error saving confidence threshold:', error);
        showNotification('Failed to save confidence threshold', 'error');
    }
}

function handleModelSelection() {
    checkTestReadiness();
}

function handleImageSelection(event) {
    const file = event.target.files[0];
    if (file) {
        processSelectedImage(file);
    }
}

function triggerFileSelection() {
    const imageInput = document.getElementById('mt-test-image-input');
    if (imageInput) {
        imageInput.click();
    }
}

function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    const uploadArea = event.currentTarget;
    uploadArea.classList.add('dragover');
}

function handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    const uploadArea = event.currentTarget;
    uploadArea.classList.remove('dragover');
}

function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const uploadArea = event.currentTarget;
    uploadArea.classList.remove('dragover');
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
            // Update the file input
            const imageInput = document.getElementById('mt-test-image-input');
            if (imageInput) {
                // Create a new FileList-like object
                const dt = new DataTransfer();
                dt.items.add(file);
                imageInput.files = dt.files;
            }
            processSelectedImage(file);
        } else {
            showNotification('Please select an image file', 'warning');
        }
    }
}

function processSelectedImage(file) {
    const imagePreview = document.getElementById('mt-selected-image-preview');
    const previewImage = document.getElementById('mt-preview-image');
    const uploadArea = document.getElementById('mt-file-upload-area');
    const combinedImageArea = document.getElementById('mt-combined-image-area');
    
    if (!imagePreview || !previewImage) return;
    
    // Create image preview
    const reader = new FileReader();
    reader.onload = function(e) {
        previewImage.src = e.target.result;
        
        // Show preview and hide upload area
        uploadArea.style.display = 'none';
        imagePreview.style.display = 'block';
        
        // Add has-content class to remove dashed border
        if (combinedImageArea) {
            combinedImageArea.classList.add('has-content');
        }
        
        checkTestReadiness();
    };
    
    reader.readAsDataURL(file);
}

function checkTestReadiness() {
    const imageInput = document.getElementById('mt-test-image-input');
    const testBtn = document.getElementById('mt-run-test-btn');
    
    if (!imageInput || !testBtn) return;
    
    const hasImage = imageInput.files && imageInput.files.length > 0;
    
    testBtn.disabled = !hasImage;
}

async function runModelTest() {
    const imageInput = document.getElementById('mt-test-image-input');
    const testBtn = document.getElementById('mt-run-test-btn');
    const resultsContent = document.getElementById('mt-test-results-content');
    
    if (!imageInput || !testBtn || !resultsContent) {
        showNotification('Missing required elements', 'error');
        return;
    }
    
    // Check if button is in reset mode
    if (testBtn.classList.contains('reset')) {
        resetTestModelForm();
        return;
    }
    
    const selectedFile = imageInput.files[0];
    
    if (!selectedFile) {
        showNotification('Please select an image to test', 'warning');
        return;
    }
    
    // Update UI to show loading
    testBtn.classList.add('loading');
    testBtn.textContent = 'Detecting...';
    testBtn.disabled = true;
    
    try {
        // Get confidence threshold value
        const confidenceInput = document.getElementById('mt-confidence-threshold-input');
        const confidence = confidenceInput ? parseFloat(confidenceInput.value) || 0.25 : 0.25;
        
        // Create FormData for the request
        const formData = new FormData();
        formData.append('image', selectedFile);
        formData.append('confidence', confidence.toString());
        
        const response = await fetch('/api/model/test', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Display results
        displayTestResults(result);
        
        showNotification('Detection completed successfully!', 'success');
        
        // Change button to reset mode
        testBtn.classList.remove('loading');
        testBtn.classList.add('reset');
        testBtn.textContent = 'Reset';
        testBtn.disabled = false;
        
    } catch (error) {
        console.error('Error running model test:', error);
        showNotification(`Detection failed: ${error.message}`, 'error');
        
        // Show error in results
        resultsContent.innerHTML = `
            <div class="mt-error-message">
                <strong>Detection Failed:</strong> ${error.message}
            </div>
        `;
        
        // Reset button to original state on error
        testBtn.classList.remove('loading');
        testBtn.textContent = 'Detect';
        testBtn.disabled = false;
    }
}

function displayTestResults(result) {
    const resultsContent = document.getElementById('mt-test-results-content');
    const resultImageContainer = document.getElementById('mt-result-image-container');
    const resultImage = document.getElementById('mt-result-image');
    const uploadArea = document.getElementById('mt-file-upload-area');
    const imagePreview = document.getElementById('mt-selected-image-preview');
    const combinedImageArea = document.getElementById('mt-combined-image-area');
    
    if (!resultsContent) return;
    
    let html = '';
    
    // Show annotated image in the combined image area if available
    if (result.annotated_image && resultImageContainer && resultImage) {
        resultImage.src = `data:image/jpeg;base64,${result.annotated_image}`;
        
        // Hide upload area and preview, show result image
        if (uploadArea) uploadArea.style.display = 'none';
        if (imagePreview) imagePreview.style.display = 'none';
        resultImageContainer.style.display = 'flex';
        
        // Add has-content class to remove dashed border
        if (combinedImageArea) {
            combinedImageArea.classList.add('has-content');
        }
    }
    
    if (result.detections && result.detections.length > 0) {
        // Show detection statistics
        html += '<div class="mt-detection-stats">';
        html += `<div class="mt-stat-item">
                    <span class="mt-stat-label">Detections Found:</span>
                    <span class="mt-stat-value">${result.detections.length}</span>
                </div>`;
        
        // Show individual detections
        result.detections.forEach((detection, index) => {
            const confidence = (detection.confidence * 100).toFixed(1);
            html += `<div class="mt-stat-item">
                        <span class="mt-stat-label">Target ${index + 1} Confidence:</span>
                        <span class="mt-stat-value">${confidence}%</span>
                    </div>`;
        });
        
        if (result.processing_time) {
            html += `<div class="mt-stat-item">
                        <span class="mt-stat-label">Processing Time:</span>
                        <span class="mt-stat-value">${result.processing_time.toFixed(2)}s</span>
                    </div>`;
        }
        
        html += '</div>';
        
    } else {
        // No detections found
        html += `
            <div class="mt-no-detections">
                <h4>No Target Detected</h4>
                <p>The model did not detect any target in the provided image.</p>
                ${result.processing_time ? `<p>Processing time: ${result.processing_time.toFixed(2)}s</p>` : ''}
            </div>
        `;
    }
    
    resultsContent.innerHTML = html;
}

// Make closeTestModelModal globally available for HTML onclick
window.closeTestModelModal = closeTestModelModal;

// Model Report Modal Functions
function openModelReportModal(modelPath) {
    const modal = document.getElementById('mt-model-report-modal');
    const title = document.getElementById('mt-report-modal-title');
    const iframe = document.getElementById('mt-report-iframe');
    
    if (!modal || !title || !iframe) {
        console.error('Model report modal elements not found');
        showNotification('Error opening model report', 'error');
        return;
    }
    
    // Set the title
    title.textContent = `Training Report - ${modelPath}`;
    
    // Set the iframe source to load the HTML report
    const reportUrl = `/api/model/report/${encodeURIComponent(modelPath)}`;
    iframe.src = reportUrl;
    
    // Show the modal
    modal.style.display = 'flex';
    
    // Handle iframe load errors
    iframe.onerror = function() {
        console.error('Error loading report');
        showNotification('Error loading model report', 'error');
        closeModelReportModal();
    };
}

function closeModelReportModal() {
    const modal = document.getElementById('mt-model-report-modal');
    const iframe = document.getElementById('mt-report-iframe');
    
    if (modal) {
        modal.style.display = 'none';
    }
    
    if (iframe) {
        iframe.src = ''; // Clear the iframe to stop loading
    }
}

// Make closeModelReportModal globally available for the HTML onclick
window.closeModelReportModal = closeModelReportModal;

// Dataset Management Functions
let datasetState = {
    currentPage: 1,
    pageSize: 25,
    totalPages: 1,
    totalImages: 0,
    currentImages: [],
    currentImageIndex: 0,
    showBoundingBoxes: false
};

// Custom Dataset State
let customDatasetState = {
    backgrounds: [],
    cursors: [],
    currentBackgroundIndex: 0,
    selectedTargetIndex: -1 // -1 means no target selected
};

async function openManageDatasetModal() {
    const modal = document.getElementById('mt-manage-dataset-modal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    
    // Initialize dataset modal
    await initializeDatasetModal();
    
    // Set up event listeners for dataset modal
    setupDatasetModalEventListeners();
}

function closeManageDatasetModal() {
    const modal = document.getElementById('mt-manage-dataset-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Make closeManageDatasetModal globally available for the HTML onclick
window.closeManageDatasetModal = closeManageDatasetModal;

async function initializeDatasetModal() {
    try {
        // Check which tab is currently selected
        const selectedTab = document.querySelector('input[name="dataset-tab"]:checked');
        const selectedTabValue = selectedTab ? selectedTab.value : 'synthetic';
        
        // Set up tab content visibility based on the selected tab
        const customTabContent = document.getElementById('mt-custom-tab');
        const syntheticTabContent = document.getElementById('mt-synthetic-tab');
        
        if (selectedTabValue === 'custom') {
            // Custom tab is selected
            if (customTabContent) customTabContent.classList.add('active');
            if (syntheticTabContent) syntheticTabContent.classList.remove('active');
            
            // Load custom dataset data
            await loadCustomDataset();
        } else {
            // Synthetic tab is selected (default)
            if (customTabContent) customTabContent.classList.remove('active');
            if (syntheticTabContent) syntheticTabContent.classList.add('active');
            
            // Show loading state
            updateDatasetLoadingState(true);
            
            // Get dataset info
            const response = await fetch('/api/dataset/synthetic/info');
            const datasetInfo = await response.json();
            
            if (!datasetInfo.dataset_exists || datasetInfo.total_images === 0) {
                showNoDatasetMessage();
                return;
            }
            
            datasetState.totalImages = datasetInfo.total_images;
            datasetState.totalPages = Math.ceil(datasetInfo.total_images / datasetState.pageSize);
            
            // Load first page
            await loadDatasetPage(1);
        }
        
    } catch (error) {
        console.error('Error initializing dataset modal:', error);
        showNotification('Failed to load dataset information', 'error');
        showNoDatasetMessage();
    }
}

async function loadDatasetPage(page) {
    try {
        // Hide zoom container immediately when starting to load new page
        hideBoundingBoxZoom();
        
        updateDatasetLoadingState(true);
        
        const response = await fetch(`/api/dataset/synthetic/images?page=${page}&page_size=${datasetState.pageSize}`);
        const data = await response.json();
        
        datasetState.currentPage = page;
        datasetState.currentImages = data.images;
        datasetState.totalImages = data.total;
        datasetState.totalPages = data.total_pages;
        datasetState.currentImageIndex = 0;
        
        // Update UI
        updateDatasetInfo();
        updatePaginationButtons();
        await loadThumbnails();
        
        if (datasetState.currentImages.length > 0) {
            showCurrentImage();
            
            // Enable bounding box toggle when images are available
            const bboxToggle = document.getElementById('mt-show-bboxes');
            if (bboxToggle) {
                bboxToggle.disabled = false;
            }
        }
        
        updateDatasetLoadingState(false);
        
    } catch (error) {
        console.error('Error loading dataset page:', error);
        showNotification('Failed to load dataset images', 'error');
        updateDatasetLoadingState(false);
    }
}

function updateDatasetInfo() {
    const totalCountEl = document.getElementById('mt-dataset-total-count');
    const currentRangeEl = document.getElementById('mt-dataset-current-range');
    const currentPageEl = document.getElementById('mt-dataset-current-page');
    const totalPagesEl = document.getElementById('mt-dataset-total-pages');
    
    if (totalCountEl) totalCountEl.textContent = datasetState.totalImages;
    if (currentPageEl) currentPageEl.textContent = datasetState.currentPage;
    if (totalPagesEl) totalPagesEl.textContent = datasetState.totalPages;
    
    if (currentRangeEl && datasetState.currentImages.length > 0) {
        const start = (datasetState.currentPage - 1) * datasetState.pageSize + 1;
        const end = Math.min(start + datasetState.currentImages.length - 1, datasetState.totalImages);
        currentRangeEl.textContent = `${start}-${end}`;
    }
}

function updatePaginationButtons() {
    const prevBtn = document.getElementById('mt-dataset-prev-page');
    const nextBtn = document.getElementById('mt-dataset-next-page');
    
    if (prevBtn) {
        prevBtn.disabled = datasetState.currentPage <= 1;
    }
    
    if (nextBtn) {
        nextBtn.disabled = datasetState.currentPage >= datasetState.totalPages;
    }
}

async function loadThumbnails() {
    const thumbnailsGrid = document.getElementById('mt-thumbnails-grid');
    if (!thumbnailsGrid) return;
    
    // Show loading message for the entire grid
    thumbnailsGrid.innerHTML = '<div class="mt-loading-message">Loading...</div>';
    
    if (datasetState.currentImages.length === 0) {
        const noImagesMessage = document.createElement('div');
        noImagesMessage.className = 'mt-no-images-message';
        noImagesMessage.textContent = 'No dataset images found.';
        thumbnailsGrid.innerHTML = '';
        thumbnailsGrid.appendChild(noImagesMessage);
        return;
    }
    
    // Create all thumbnail items and track image loading
    const thumbnailItems = [];
    const imageLoadPromises = [];
    
    for (let i = 0; i < datasetState.currentImages.length; i++) {
        const image = datasetState.currentImages[i];
        const thumbnailItem = document.createElement('div');
        thumbnailItem.className = 'mt-thumbnail-item';
        if (i === datasetState.currentImageIndex) {
            thumbnailItem.classList.add('active');
        }
        
        const imgSrc = datasetState.showBoundingBoxes 
            ? `/api/dataset/synthetic/image/${image.name}/with-boxes` 
            : `/api/dataset/synthetic/image/${image.name}`;
        
        // Create image element
        const imgElement = document.createElement('img');
        imgElement.alt = image.name;
        imgElement.loading = 'eager'; // Load immediately instead of lazy
        
        // Create a promise that resolves when this image loads or fails
        const imageLoadPromise = new Promise((resolve) => {
            imgElement.onload = () => resolve();
            imgElement.onerror = () => resolve(); // Resolve even on error so we don't hang
        });
        
        imageLoadPromises.push(imageLoadPromise);
        
        // Set the image source to start loading
        imgElement.src = imgSrc;
        
        // Create thumbnail structure
        thumbnailItem.innerHTML = `
            <div class="mt-thumbnail-label">${image.name}</div>
        `;
        thumbnailItem.insertBefore(imgElement, thumbnailItem.firstChild);
        
        thumbnailItem.addEventListener('click', () => {
            datasetState.currentImageIndex = i;
            showCurrentImage();
            updateThumbnailSelection();
        });
        
        thumbnailItems.push(thumbnailItem);
    }
    
    // Wait for all images to finish loading (or fail)
    await Promise.all(imageLoadPromises);
    
    // Now replace loading message with all thumbnails
    thumbnailsGrid.innerHTML = '';
    thumbnailItems.forEach(item => {
        thumbnailsGrid.appendChild(item);
    });
}

function showCurrentImage() {
    if (datasetState.currentImages.length === 0) return;
    
    const currentImage = datasetState.currentImages[datasetState.currentImageIndex];
    const imageEl = document.getElementById('mt-dataset-current-image');
    const imageNameEl = document.getElementById('mt-current-image-name');
    const imageSizeEl = document.getElementById('mt-current-image-size');
    const carouselCurrentEl = document.getElementById('mt-carousel-current');
    const carouselTotalEl = document.getElementById('mt-carousel-total');
    
    if (imageEl) {
        // Show loading state
        const imageContainer = document.getElementById('mt-dataset-image-container');
        if (imageContainer) {
            // Create or get loading overlay
            let loadingOverlay = imageContainer.querySelector('.mt-image-loading-overlay');
            if (!loadingOverlay) {
                loadingOverlay = document.createElement('div');
                loadingOverlay.className = 'mt-image-loading-overlay';
                loadingOverlay.innerHTML = '<div class="mt-image-loading-text">Loading...</div>';
                imageContainer.appendChild(loadingOverlay);
            }
            loadingOverlay.style.display = 'flex';
        }
        
        // Hide zoom container while loading
        hideBoundingBoxZoom();
        
        // Check if bounding boxes should be shown
        const showBboxes = datasetState.showBoundingBoxes;
        const imageUrl = showBboxes 
            ? `/api/dataset/synthetic/image/${currentImage.name}/with-boxes`
            : `/api/dataset/synthetic/image/${currentImage.name}`;
        
        // Hide image initially
        imageEl.style.display = 'none';
        
        // Set up load handlers
        const originalOnload = showBboxes ? () => loadBoundingBoxZoom(currentImage.name) : null;
        
        imageEl.onload = () => {
            // Hide loading overlay
            const loadingOverlay = imageContainer?.querySelector('.mt-image-loading-overlay');
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }
            
            // Show the image
            imageEl.style.display = 'block';
            
            // Execute original onload if needed (this will show zoom if bboxes enabled)
            if (originalOnload) {
                originalOnload();
            }
        };
        
        imageEl.onerror = () => {
            // Hide loading overlay and show error
            const loadingOverlay = imageContainer?.querySelector('.mt-image-loading-overlay');
            if (loadingOverlay) {
                const loadingText = loadingOverlay.querySelector('.mt-image-loading-text');
                if (loadingText) {
                    loadingText.textContent = 'Error loading image';
                }
            }
        };
        
        // Clear any pending onload event if boxes are disabled
        if (!showBboxes) {
            hideBoundingBoxZoom();
        }
        
        imageEl.src = imageUrl;
        imageEl.alt = currentImage.name;
    }
    
    if (imageNameEl) {
        imageNameEl.textContent = currentImage.name;
        imageNameEl.style.display = 'inline';
    }
    if (imageSizeEl) {
        imageSizeEl.textContent = `${currentImage.width}x${currentImage.height}`;
        imageSizeEl.style.display = 'inline';
    }
    if (carouselCurrentEl) carouselCurrentEl.textContent = datasetState.currentImageIndex + 1;
    if (carouselTotalEl) carouselTotalEl.textContent = datasetState.currentImages.length;
    
    updateCarouselButtons();
    
    // Enable delete button when images are available
    const deleteBtn = document.getElementById('mt-delete-current-image');
    if (deleteBtn) deleteBtn.disabled = false;
    updateThumbnailSelection();
}

function updateCarouselButtons() {
    const prevBtn = document.getElementById('mt-carousel-prev');
    const nextBtn = document.getElementById('mt-carousel-next');
    
    if (prevBtn) {
        prevBtn.disabled = datasetState.currentImageIndex <= 0;
    }
    
    if (nextBtn) {
        nextBtn.disabled = datasetState.currentImageIndex >= datasetState.currentImages.length - 1;
    }
}

async function loadBoundingBoxZoom(imageName) {
    try {
        // Check if bounding boxes are still enabled (prevent race conditions)
        if (!datasetState.showBoundingBoxes) {
            hideBoundingBoxZoom();
            return;
        }
        
        const zoomContainer = document.getElementById('mt-bbox-zoom-container');
        const zoomCanvas = document.getElementById('mt-bbox-zoom-canvas');
        
        if (!zoomContainer || !zoomCanvas) return;
        
        // Load the labels for this image
        const response = await fetch(`/api/dataset/synthetic/image/${imageName}/labels`);
        if (!response.ok) {
            hideBoundingBoxZoom();
            return;
        }
        
        const labels = await response.json();
        if (!labels || labels.length === 0) {
            hideBoundingBoxZoom();
            return;
        }
        
        // Use the first bounding box for zoom (can be enhanced to show all boxes)
        const firstLabel = labels[0];
        
        // Load the original image (without boxes) for cropping
        const originalImg = new Image();
        originalImg.crossOrigin = 'anonymous';
        
        originalImg.onload = () => {
            const canvas = zoomCanvas;
            const ctx = canvas.getContext('2d');
            
            // Set canvas size to match container
            canvas.width = 150;
            canvas.height = 130; // Leave space for label at bottom
            
            // Calculate bounding box in pixel coordinates
            const imgWidth = originalImg.naturalWidth;
            const imgHeight = originalImg.naturalHeight;
            
            const centerX = firstLabel.x_center * imgWidth;
            const centerY = firstLabel.y_center * imgHeight;
            const boxWidth = firstLabel.width * imgWidth;
            const boxHeight = firstLabel.height * imgHeight;
            
            // Calculate crop area around the bounding box
            const cropSize = Math.max(boxWidth, boxHeight) * 1.5; // 50% padding around the box
            const cropX = Math.max(0, centerX - cropSize/2);
            const cropY = Math.max(0, centerY - cropSize/2);
            const actualCropWidth = Math.min(imgWidth - cropX, cropSize);
            const actualCropHeight = Math.min(imgHeight - cropY, cropSize);
            
            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw the cropped and zoomed image
            ctx.drawImage(
                originalImg,
                cropX, cropY, actualCropWidth, actualCropHeight,  // Source crop area
                0, 0, canvas.width, canvas.height                 // Destination (fill canvas)
            );
            
            // Calculate bounding box position in the zoomed view
            const zoomFactorX = canvas.width / actualCropWidth;
            const zoomFactorY = canvas.height / actualCropHeight;
            
            const boxInCropX = (centerX - boxWidth/2 - cropX) * zoomFactorX;
            const boxInCropY = (centerY - boxHeight/2 - cropY) * zoomFactorY;
            const boxZoomedWidth = boxWidth * zoomFactorX;
            const boxZoomedHeight = boxHeight * zoomFactorY;
            
            // Draw red bounding box overlay
            ctx.strokeStyle = '#FF0000';
            ctx.lineWidth = 2;
            ctx.strokeRect(boxInCropX, boxInCropY, boxZoomedWidth, boxZoomedHeight);
            
            // Show the zoom container
            zoomContainer.style.display = 'block';
        };
        
        originalImg.onerror = () => {
            hideBoundingBoxZoom();
        };
        
        originalImg.src = `/api/dataset/synthetic/image/${imageName}`;
        
    } catch (error) {
        console.error('Error loading bounding box zoom:', error);
        hideBoundingBoxZoom();
    }
}

function hideBoundingBoxZoom() {
    const zoomContainer = document.getElementById('mt-bbox-zoom-container');
    if (zoomContainer) {
        zoomContainer.style.display = 'none';
    }
}

function updateThumbnailSelection() {
    const thumbnails = document.querySelectorAll('.mt-thumbnail-item');
    thumbnails.forEach((thumb, index) => {
        thumb.classList.toggle('active', index === datasetState.currentImageIndex);
    });
}

function updateDatasetLoadingState(loading) {
    const loadingEl = document.getElementById('mt-dataset-loading');
    const imageEl = document.getElementById('mt-dataset-current-image');
    const noImagesEl = document.getElementById('mt-dataset-no-images');
    
    if (loading) {
        if (loadingEl) loadingEl.style.display = 'block';
        if (imageEl) imageEl.style.display = 'none';
        if (noImagesEl) noImagesEl.style.display = 'none';
    } else {
        if (loadingEl) loadingEl.style.display = 'none';
    }
}

function showNoDatasetMessage() {
    const loadingEl = document.getElementById('mt-dataset-loading');
    const imageEl = document.getElementById('mt-dataset-current-image');
    const noImagesEl = document.getElementById('mt-dataset-no-images');
    
    if (loadingEl) loadingEl.style.display = 'none';
    if (imageEl) imageEl.style.display = 'none';
    if (noImagesEl) noImagesEl.style.display = 'block';
    
    // Update stats
    const totalCountEl = document.getElementById('mt-dataset-total-count');
    if (totalCountEl) totalCountEl.textContent = '0';
    
    // Disable page navigation buttons
    const prevPageBtn = document.getElementById('mt-dataset-prev-page');
    const nextPageBtn = document.getElementById('mt-dataset-next-page');
    if (prevPageBtn) prevPageBtn.disabled = true;
    if (nextPageBtn) nextPageBtn.disabled = true;
    
    // Disable carousel buttons
    const carouselPrevBtn = document.getElementById('mt-carousel-prev');
    const carouselNextBtn = document.getElementById('mt-carousel-next');
    if (carouselPrevBtn) carouselPrevBtn.disabled = true;
    if (carouselNextBtn) carouselNextBtn.disabled = true;
    
    // Disable delete button
    const deleteBtn = document.getElementById('mt-delete-current-image');
    if (deleteBtn) deleteBtn.disabled = true;
    
    // Disable and uncheck bounding box toggle
    const bboxToggle = document.getElementById('mt-show-bboxes');
    if (bboxToggle) {
        bboxToggle.disabled = true;
        bboxToggle.checked = false;
        datasetState.showBoundingBoxes = false;
    }
    
    // Hide image information (name and size)
    const imageNameEl = document.getElementById('mt-current-image-name');
    const imageSizeEl = document.getElementById('mt-current-image-size');
    if (imageNameEl) imageNameEl.style.display = 'none';
    if (imageSizeEl) imageSizeEl.style.display = 'none';
    
    // Clear current images and load empty thumbnails to show "No dataset images found." message
    datasetState.currentImages = [];
    loadThumbnails();
}

async function deleteCurrentImage() {
    if (datasetState.currentImages.length === 0) return;
    
    const currentImage = datasetState.currentImages[datasetState.currentImageIndex];
    
    if (!confirm(`Are you sure you want to delete "${currentImage.name}" and its corresponding label?`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/dataset/synthetic/image/${currentImage.name}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showNotification(`Successfully deleted ${currentImage.name}`, 'success');
            
            // Reload current page
            await loadDatasetPage(datasetState.currentPage);
        } else {
            throw new Error('Failed to delete image');
        }
    } catch (error) {
        console.error('Error deleting image:', error);
        showNotification('Failed to delete image', 'error');
    }
}

function setupDatasetModalEventListeners() {
    // Tab switching functionality with radio buttons
    const tabRadios = document.querySelectorAll('input[name="dataset-tab"]');
    const tabContents = document.querySelectorAll('.mt-tab-content');
    
    tabRadios.forEach((radio, index) => {
        radio.addEventListener('change', async () => {
            if (radio.checked) {
                const targetTab = radio.value;
                
                // Hide all tab contents
                tabContents.forEach(content => {
                    content.classList.remove('active');
                });
                
                // Show the selected tab content
                const targetContent = document.getElementById(`mt-${targetTab}-tab`);
                
                if (targetContent) {
                    targetContent.classList.add('active');
                    
                    // Load data for the selected tab
                    if (targetTab === 'custom') {
                        await loadCustomDataset();
                    } else if (targetTab === 'synthetic') {
                        // Reload synthetic dataset
                        try {
                            updateDatasetLoadingState(true);
                            const response = await fetch('/api/dataset/synthetic/info');
                            const datasetInfo = await response.json();
                            
                            if (!datasetInfo.dataset_exists || datasetInfo.total_images === 0) {
                                showNoDatasetMessage();
                                return;
                            }
                            
                            datasetState.totalImages = datasetInfo.total_images;
                            datasetState.totalPages = Math.ceil(datasetInfo.total_images / datasetState.pageSize);
                            await loadDatasetPage(1);
                        } catch (error) {
                            console.error('Error loading synthetic dataset:', error);
                        }
                    }
                }
            }
        });
    });
    
    // Pagination buttons (synthetic dataset)
    const prevPageBtn = document.getElementById('mt-dataset-prev-page');
    const nextPageBtn = document.getElementById('mt-dataset-next-page');
    
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', async () => {
            if (datasetState.currentPage > 1) {
                await loadDatasetPage(datasetState.currentPage - 1);
            }
        });
    }
    
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', async () => {
            if (datasetState.currentPage < datasetState.totalPages) {
                await loadDatasetPage(datasetState.currentPage + 1);
            }
        });
    }
    
    // Carousel buttons (synthetic dataset)
    const carouselPrevBtn = document.getElementById('mt-carousel-prev');
    const carouselNextBtn = document.getElementById('mt-carousel-next');
    
    if (carouselPrevBtn) {
        carouselPrevBtn.addEventListener('click', () => {
            if (datasetState.currentImageIndex > 0) {
                datasetState.currentImageIndex--;
                showCurrentImage();
            }
        });
    }
    
    if (carouselNextBtn) {
        carouselNextBtn.addEventListener('click', () => {
            if (datasetState.currentImageIndex < datasetState.currentImages.length - 1) {
                datasetState.currentImageIndex++;
                showCurrentImage();
            }
        });
    }
    
    // Custom dataset carousel buttons
    const customCarouselPrevBtn = document.getElementById('mt-custom-carousel-prev');
    const customCarouselNextBtn = document.getElementById('mt-custom-carousel-next');
    
    if (customCarouselPrevBtn) {
        customCarouselPrevBtn.addEventListener('click', () => {
            if (customDatasetState.currentBackgroundIndex > 0) {
                customDatasetState.currentBackgroundIndex--;
                showCurrentCustomBackground();
            }
        });
    }
    
    if (customCarouselNextBtn) {
        customCarouselNextBtn.addEventListener('click', () => {
            if (customDatasetState.currentBackgroundIndex < customDatasetState.backgrounds.length - 1) {
                customDatasetState.currentBackgroundIndex++;
                showCurrentCustomBackground();
            }
        });
    }
    
    // Delete button (synthetic dataset)
    const deleteBtn = document.getElementById('mt-delete-current-image');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', deleteCurrentImage);
    }
    
    // Delete button (custom dataset)
    const deleteCustomBtn = document.getElementById('mt-delete-custom-background');
    if (deleteCustomBtn) {
        deleteCustomBtn.addEventListener('click', deleteCurrentCustomBackground);
    }
    
    // Bounding box toggle
    const bboxToggle = document.getElementById('mt-show-bboxes');
    if (bboxToggle) {
        bboxToggle.addEventListener('change', (e) => {
            datasetState.showBoundingBoxes = e.target.checked;
            showCurrentImage(); // Refresh current image
            loadThumbnails(); // Refresh all thumbnails
        });
    }
}

// Custom Dataset Functions
async function loadCustomDataset() {
    try {
        await Promise.all([
            loadCustomBackgrounds(),
            loadCustomCursors()
        ]);
        
        // Ensure dataset generation controls are properly initialized
        updateDatasetGenerationControls();
    } catch (error) {
        console.error('Error loading custom dataset:', error);
        showNotification('Failed to load custom dataset', 'error');
    }
}

async function loadCustomBackgrounds() {
    const loadingElement = document.getElementById('mt-custom-loading');
    const noImagesElement = document.getElementById('mt-custom-no-images');
    const imageElement = document.getElementById('mt-custom-current-image');
    
    if (loadingElement) loadingElement.style.display = 'block';
    if (noImagesElement) noImagesElement.style.display = 'none';
    if (imageElement) imageElement.style.display = 'none';
    
    try {
        const response = await fetch('/api/dataset/custom/backgrounds');
        if (!response.ok) throw new Error('Failed to fetch backgrounds');
        
        const data = await response.json();
        customDatasetState.backgrounds = data.backgrounds || [];
        customDatasetState.currentBackgroundIndex = 0;
        
        updateCustomBackgroundCount();
        updateCustomBackgroundNavigation();
        
        if (customDatasetState.backgrounds.length > 0) {
            showCurrentCustomBackground();
        } else {
            if (loadingElement) loadingElement.style.display = 'none';
            if (noImagesElement) noImagesElement.style.display = 'block';
        }
        
        // Update dataset generation controls when backgrounds are loaded
        updateDatasetGenerationControls();
    } catch (error) {
        console.error('Error loading custom backgrounds:', error);
        if (loadingElement) loadingElement.style.display = 'none';
        if (noImagesElement) noImagesElement.style.display = 'block';
    }
}

async function loadCustomCursors() {
    const loadingElement = document.getElementById('mt-custom-cursors-loading');
    const gridElement = document.getElementById('mt-custom-cursors-grid');
    
    if (loadingElement) loadingElement.style.display = 'block';
    
    try {
        const response = await fetch('/api/dataset/custom/targets');
        if (!response.ok) throw new Error('Failed to fetch targets');
        
        const data = await response.json();
        customDatasetState.cursors = data.targets || [];
        customDatasetState.selectedTargetIndex = -1; // Reset selection when loading new data
        
        updateCustomCursorCount();
        renderCustomCursorThumbnails();
        resetSelectedTargetDisplay(); // Reset selection display since selection is reset
    } catch (error) {
        console.error('Error loading custom targets:', error);
        if (loadingElement) {
            loadingElement.textContent = 'Failed to load target images';
        }
    }
}

function showCurrentCustomBackground() {
    const loadingElement = document.getElementById('mt-custom-loading');
    const imageElement = document.getElementById('mt-custom-current-image');
    const nameElement = document.getElementById('mt-custom-image-name');
    const sizeElement = document.getElementById('mt-custom-image-size');
    
    if (customDatasetState.backgrounds.length === 0) {
        if (loadingElement) loadingElement.style.display = 'none';
        return;
    }
    
    const currentBackground = customDatasetState.backgrounds[customDatasetState.currentBackgroundIndex];
    
    if (imageElement) {
        if (loadingElement) {
            loadingElement.style.display = 'block';
        }
        imageElement.style.display = 'none';
        
        imageElement.onload = () => {
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
            imageElement.style.display = 'block';
            
            if (sizeElement) {
                const size = `${imageElement.naturalWidth}x${imageElement.naturalHeight}`;
                sizeElement.textContent = size;
            }
        };
        
        imageElement.onerror = () => {
            console.error('Failed to load background image:', currentBackground.filename);
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
        };
        
        const imageUrl = `/api/dataset/custom/backgrounds/${currentBackground.filename}`;
        imageElement.src = imageUrl;
    }
    
    if (nameElement) {
        nameElement.textContent = currentBackground.filename;
    }
    
    updateCustomBackgroundNavigation();
}

function renderCustomCursorThumbnails() {
    const gridElement = document.getElementById('mt-custom-cursors-grid');
    const loadingElement = document.getElementById('mt-custom-cursors-loading');
    
    if (!gridElement) {
        console.error('Cursor grid element not found!');
        return;
    }
    
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }
    
    // Clear existing thumbnails
    gridElement.innerHTML = '';
    
    if (customDatasetState.cursors.length === 0) {
        gridElement.innerHTML = '<div class="mt-no-content">No cursor images found</div>';
        return;
    }
    
    customDatasetState.cursors.forEach((cursor, index) => {
        const thumbnailContainer = document.createElement('div');
        thumbnailContainer.className = 'mt-thumbnail-container';
        
        // Add selected class if this is the selected target
        if (index === customDatasetState.selectedTargetIndex) {
            thumbnailContainer.classList.add('mt-thumbnail-selected');
        }
        
        // Add click event to select this target
        thumbnailContainer.onclick = (e) => {
            if (!e.target.classList.contains('mt-thumbnail-delete')) {
                selectCustomTarget(index);
            }
        };
        
        thumbnailContainer.style.cursor = 'pointer';
        
        const img = document.createElement('img');
        img.className = 'mt-thumbnail-image';
        img.src = `/api/dataset/custom/targets/${cursor.filename}`;
        img.alt = cursor.filename;
        img.title = cursor.filename;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'mt-thumbnail-delete';
        deleteBtn.innerHTML = '×';
        deleteBtn.title = 'Delete target';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deleteCustomCursor(index);
        };
        
        thumbnailContainer.appendChild(img);
        thumbnailContainer.appendChild(deleteBtn);
        gridElement.appendChild(thumbnailContainer);
    });
}

function selectCustomTarget(index) {
    // Update the selected target index
    customDatasetState.selectedTargetIndex = index;
    
    // Re-render thumbnails to update visual selection
    renderCustomCursorThumbnails();
    
    // Update the selected target name in stats
    const selectedTarget = customDatasetState.cursors[index];
    if (selectedTarget) {
        const targetNameElement = document.getElementById('mt-selected-target-name');
        if (targetNameElement) {
            targetNameElement.textContent = selectedTarget.filename;
        }
        
        console.log('Selected target:', selectedTarget.filename);
    }
    
    // Update dataset generation controls
    updateDatasetGenerationControls();
}

function resetSelectedTargetDisplay() {
    const targetNameElement = document.getElementById('mt-selected-target-name');
    if (targetNameElement) {
        targetNameElement.textContent = 'None';
    }
    
    // Update dataset generation controls
    updateDatasetGenerationControls();
}

function updateDatasetGenerationControls() {
    const countInput = document.getElementById('mt-dataset-count');
    const generateBtn = document.getElementById('mt-generate-dataset-btn');
    
    if (countInput && generateBtn) {
        // Enable only if target is selected AND there's at least 1 background
        const hasSelectedTarget = customDatasetState.selectedTargetIndex >= 0;
        const hasBackgrounds = customDatasetState.backgrounds.length > 0;
        const shouldEnable = hasSelectedTarget && hasBackgrounds;
        
        countInput.disabled = !shouldEnable;
        generateBtn.disabled = !shouldEnable;
    }
}

function updateCustomBackgroundCount() {
    const countElement = document.getElementById('mt-custom-backgrounds-count');
    const count = customDatasetState.backgrounds.length;
    if (countElement) {
        countElement.textContent = count;
    } else {
        console.error('mt-custom-backgrounds-count element not found!');
    }
}

function updateCustomCursorCount() {
    const countElement = document.getElementById('mt-custom-cursors-count');
    const count = customDatasetState.cursors.length;
    if (countElement) {
        countElement.textContent = count;
    } else {
        console.error('mt-custom-cursors-count element not found!');
    }
}

function updateCustomBackgroundNavigation() {
    const currentElement = document.getElementById('mt-custom-carousel-current');
    const totalElement = document.getElementById('mt-custom-carousel-total');
    const currentBgElement = document.getElementById('mt-custom-current-bg');
    const totalBgElement = document.getElementById('mt-custom-total-bg');
    const prevBtn = document.getElementById('mt-custom-carousel-prev');
    const nextBtn = document.getElementById('mt-custom-carousel-next');
    
    const current = customDatasetState.currentBackgroundIndex + 1;
    const total = customDatasetState.backgrounds.length;
    
    if (currentElement) currentElement.textContent = current;
    if (totalElement) totalElement.textContent = total;
    if (currentBgElement) currentBgElement.textContent = current;
    if (totalBgElement) totalBgElement.textContent = total;
    
    if (prevBtn) {
        prevBtn.disabled = customDatasetState.currentBackgroundIndex === 0;
    }
    
    if (nextBtn) {
        nextBtn.disabled = customDatasetState.currentBackgroundIndex >= total - 1;
    }
}

async function deleteCurrentCustomBackground() {
    if (customDatasetState.backgrounds.length === 0) return;
    
    const currentBackground = customDatasetState.backgrounds[customDatasetState.currentBackgroundIndex];
    
    if (!confirm(`Are you sure you want to delete "${currentBackground.filename}"?`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/dataset/custom/backgrounds/${currentBackground.filename}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to delete background');
        
        // Remove from local state
        customDatasetState.backgrounds.splice(customDatasetState.currentBackgroundIndex, 1);
        
        // Adjust current index if necessary
        if (customDatasetState.currentBackgroundIndex >= customDatasetState.backgrounds.length) {
            customDatasetState.currentBackgroundIndex = Math.max(0, customDatasetState.backgrounds.length - 1);
        }
        
        updateCustomBackgroundCount();
        updateCustomBackgroundNavigation();
        
        if (customDatasetState.backgrounds.length > 0) {
            showCurrentCustomBackground();
        } else {
            const loadingElement = document.getElementById('mt-custom-loading');
            const noImagesElement = document.getElementById('mt-custom-no-images');
            const imageElement = document.getElementById('mt-custom-current-image');
            
            if (loadingElement) loadingElement.style.display = 'none';
            if (noImagesElement) noImagesElement.style.display = 'block';
            if (imageElement) imageElement.style.display = 'none';
        }
        
        showNotification('Background deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting background:', error);
        showNotification('Failed to delete background', 'error');
    }
}

async function deleteCustomCursor(index) {
    if (index < 0 || index >= customDatasetState.cursors.length) return;
    
    const cursor = customDatasetState.cursors[index];
    
    if (!confirm(`Are you sure you want to delete "${cursor.filename}"?`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/dataset/custom/targets/${cursor.filename}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to delete target');
        
        // Remove from local state
        customDatasetState.cursors.splice(index, 1);
        
        updateCustomCursorCount();
        renderCustomCursorThumbnails();
        
        showNotification('Target deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting target:', error);
        showNotification('Failed to delete target', 'error');
    }
}