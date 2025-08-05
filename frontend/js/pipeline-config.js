// Pipeline Configuration Manager
export class PipelineConfig {
    constructor() {
        this.config = null;
        this.variables = {};
    }

    async loadConfig(configPath = '/config/training-pipeline.json') {
        try {
            const response = await fetch(configPath);
            if (!response.ok) {
                throw new Error(`Failed to load pipeline config: ${response.status}`);
            }
            this.config = await response.json();
            this.initializeVariables();
            return this.config;
        } catch (error) {
            console.error('Error loading pipeline config:', error);
            // Fallback to default config
            this.config = this.getDefaultConfig();
            this.initializeVariables();
            return this.config;
        }
    }

    initializeVariables() {
        if (this.config && this.config.pipeline && this.config.pipeline.variables) {
            Object.keys(this.config.pipeline.variables).forEach(key => {
                const variable = this.config.pipeline.variables[key];
                this.variables[key] = variable.default;
            });
        }
    }

    getStages() {
        return this.config?.pipeline?.stages || [];
    }

    getEnabledStages() {
        return this.getStages().filter(stage => stage.enabled);
    }

    getVariables() {
        return this.config?.pipeline?.variables || {};
    }

    setVariable(key, value) {
        this.variables[key] = value;
    }

    getVariable(key) {
        return this.variables[key];
    }

    // Replace variables in script arguments
    processArguments(args) {
        return args.map(arg => {
            if (typeof arg === 'string' && arg.includes('{') && arg.includes('}')) {
                // Replace variable placeholders
                return arg.replace(/\{(\w+)\}/g, (match, varName) => {
                    return this.variables[varName] || match;
                });
            }
            return arg;
        });
    }

    // Generate HTML for dynamic controls based on variables
    generateControlsHTML() {
        const variables = this.getVariables();
        let html = '';

        Object.keys(variables).forEach(key => {
            const variable = variables[key];
            
            // Only show variables that are configured to display in UI
            if (variable.display_in_ui !== true) {
                return;
            }
            
            switch (variable.type) {
                case 'number':
                    html += `
                        <div class="${key}-control">
                            <label for="var-${key}">${variable.label}:</label>
                            <input type="number" id="var-${key}" value="${variable.default}" 
                                   min="${variable.min || 1}" max="${variable.max || 1000}">
                        </div>
                    `;
                    break;
                case 'text':
                    html += `
                        <div class="${key}-control">
                            <label for="var-${key}">${variable.label}:</label>
                            <input type="text" id="var-${key}" value="${variable.default || ''}">
                        </div>
                    `;
                    break;
                case 'selector':
                    // All selectors use options array
                    const options = variable.options || [];
                    html += `
                        <div class="${key}-control">
                            <label for="var-${key}">${variable.label}:</label>
                            <select id="var-${key}">
                                <option value="">Select an option...</option>
                                ${options.map(option => `
                                    <option value="${option}" ${variable.default === option ? 'selected' : ''}>
                                        ${option}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                    `;
                    break;
            }
        });

        // If no controls were generated, show placeholder
        if (html === '') {
            html = '<div class="empty-controls-placeholder">No training parameters configured</div>';
        }

        return html;
    }

    // Generate progress indicator HTML
    generateProgressHTML() {
        const stages = this.getEnabledStages();
        let html = '<div id="training-progress-indicator" class="progress-indicator';
        
        if (stages.length === 0) {
            html += ' empty">';
            html += 'No pipeline stages configured';
        } else {
            html += '">';
            stages.forEach((stage, index) => {
                html += `<span class="progress-step" id="${stage.id}-step">${index + 1}. ${stage.description}</span>`;
            });
        }
        
        html += '</div>';
        return html;
    }

    getDefaultConfig() {
        return {
            "pipeline": {
                "selected_model_variable_reference": "model_path",
                "confidence_threshold": 0.25,
                "stages": [],
                "variables": {
                    "model_path": {
                        "type": "selector",
                        "label": "Base Model",
                        "default": "yolov8n.pt",
                        "options": [
                            "yolov8n.pt"
                        ],
                        "display_in_ui": false
                    }
                }
            }
        };
    }
}

// Pipeline execution manager
export class PipelineExecutor {
    constructor(pipelineConfig, logContainer) {
        this.config = pipelineConfig;
        this.logContainer = logContainer;
        this.currentStage = 0;
        this.progressSteps = {};
        this.isCancelled = false;
        this.activeSocket = null;
    }

    initializeProgressSteps() {
        const stages = this.config.getEnabledStages();
        stages.forEach(stage => {
            this.progressSteps[stage.id] = document.getElementById(`${stage.id}-step`);
        });
    }

    cancel() {
        this.isCancelled = true;
        if (this.activeSocket) {
            try {
                // Send cancellation message to backend
                this.activeSocket.send("CANCEL");
                // Close the socket
                this.activeSocket.close(4001, 'User cancelled execution');
            } catch (error) {
                console.log('Error sending cancel message:', error);
                // Force close if send fails
                this.activeSocket.close(4001, 'User cancelled execution');
            }
        }
        this.logContainer.innerHTML += `<div style="color: orange; font-weight: bold; margin: 10px 0;">🚫 Pipeline execution cancelled by user</div>`;
        
        // Mark all active and remaining stages as cancelled
        Object.values(this.progressSteps).forEach(step => {
            if (step && !step.classList.contains('completed')) {
                step.classList.remove('active');
                step.classList.add('cancelled');
            }
        });
    }

    async executeStage(stage) {
        if (!stage.enabled || this.isCancelled) {
            return;
        }

        const progressStep = this.progressSteps[stage.id];
        if (progressStep) {
            progressStep.classList.add('active');
        }

        this.logContainer.innerHTML += `<h3>Stage ${this.currentStage + 1}: ${stage.description}...</h3>`;

        try {
            for (let i = 0; i < stage.scripts.length; i++) {
                if (this.isCancelled) {
                    throw new Error('Pipeline execution was cancelled');
                }
                
                const script = stage.scripts[i];
                const processedArgs = this.config.processArguments(script.args);
                
                // Add small delay between scripts to allow WebSocket cleanup
                if (i > 0) {
                    this.logContainer.innerHTML += `<div><em>Waiting for connection cleanup...</em></div>`;
                    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
                }
                
                try {
                    await this.runScript(script.script, processedArgs);
                } catch (scriptError) {
                    // Check if error is due to cancellation
                    if (this.isCancelled || scriptError.message.includes('cancelled')) {
                        throw new Error('Pipeline execution was cancelled');
                    }
                    
                    // Log the specific script failure
                    this.logContainer.innerHTML += `<div style="color: red; font-weight: bold;">❌ Script failed: ${script.script}</div>`;
                    this.logContainer.innerHTML += `<div style="color: red;">Error: ${scriptError.message}</div>`;
                    
                    // Mark stage as failed and stop pipeline
                    if (progressStep) {
                        progressStep.classList.remove('active');
                        progressStep.classList.add('error');
                    }
                    
                    // Create more specific error message
                    const stageError = new Error(`Stage "${stage.description}" failed at script: ${script.script}. ${scriptError.message}`);
                    stageError.stage = stage.id;
                    stageError.script = script.script;
                    throw stageError;
                }
            }

            if (progressStep && !this.isCancelled) {
                progressStep.classList.remove('active');
                progressStep.classList.add('completed');
            }
        } catch (error) {
            if (progressStep) {
                progressStep.classList.remove('active');
                if (!this.isCancelled) {
                    progressStep.classList.add('error');
                }
            }
            throw error;
        }

        this.currentStage++;
    }

    async executePipeline() {
        const stages = this.config.getEnabledStages();
        this.currentStage = 0;
        this.isCancelled = false; // Reset cancellation state
        
        // Reset progress indicators
        Object.values(this.progressSteps).forEach(step => {
            if (step) {
                step.classList.remove('active', 'completed', 'error', 'cancelled');
            }
        });

        try {
            for (const stage of stages) {
                if (this.isCancelled) {
                    throw new Error('Pipeline execution was cancelled');
                }
                await this.executeStage(stage);
            }
            
            if (!this.isCancelled) {
                this.logContainer.innerHTML += '<h2 style="color: green;">✅ Training pipeline completed successfully!</h2>';
                
                // Show success notification
                showNotification('Training pipeline completed successfully! 🎉', 'success');
            }
            
        } catch (error) {
            if (this.isCancelled || error.message.includes('cancelled')) {
                // Show cancellation notification
                showNotification('Training pipeline was cancelled', 'warning');
                return; // Don't show error for cancellation
            }
            
            console.error('Training pipeline failed:', error);
            this.logContainer.innerHTML += `
                <div style="color: red; border: 2px solid red; padding: 10px; margin: 10px 0; background: #ffe6e6;">
                    <h3 style="color: red; margin: 0 0 10px 0;">🚫 PIPELINE EXECUTION STOPPED</h3>
                    <strong>Failed Stage:</strong> ${error.stage || 'Unknown'}<br>
                    <strong>Failed Script:</strong> ${error.script || 'Unknown'}<br>
                    <strong>Error Details:</strong> ${error.message}
                </div>
            `;
            
            // Mark all remaining stages as cancelled
            Object.values(this.progressSteps).forEach(step => {
                if (step && !step.classList.contains('completed') && !step.classList.contains('error')) {
                    step.classList.add('cancelled');
                }
                step.classList.remove('active');
            });
            
            // Show error notification
            showNotification(`Pipeline failed: ${error.message}`, 'error');
            
            throw error;
        }
    }

    async runScript(scriptPath, args, retryCount = 0) {
        const maxRetries = 3;
        
        try {
            return await this.executeScript(scriptPath, args);
        } catch (error) {
            if (retryCount < maxRetries && error.message.includes('WebSocket connection closed unexpectedly')) {
                console.log(`Retrying script execution (attempt ${retryCount + 1}/${maxRetries + 1}):`, scriptPath);
                this.logContainer.innerHTML += `<div style="color: orange;"><em>Connection failed, retrying in 3 seconds... (${retryCount + 1}/${maxRetries + 1})</em></div>`;
                
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                return await this.runScript(scriptPath, args, retryCount + 1);
            } else {
                throw error;
            }
        }
    }

    executeScript(scriptPath, args) {
        return new Promise((resolve, reject) => {
            if (this.isCancelled) {
                reject(new Error('Script execution cancelled'));
                return;
            }
            
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${wsProtocol}//${window.location.host}/api/script/ws/execute`;
            const socket = new WebSocket(wsUrl);
            
            // Store reference to active socket for cancellation
            this.activeSocket = socket;

            this.logContainer.innerHTML += `<div><em>Executing: python ${scriptPath} ${args.join(' ')}</em></div>`;

            // Track execution completion and message deduplication
            let executionCompleted = false;
            let executionFailed = false;
            let lastTrainingProgressDiv = null; // Track the last training progress message div
            let lastValidationProgressDiv = null; // Track the last validation progress message div

            // Helper function to detect training progress messages
            const isProgressMessage = (message) => {
                // Clean the message by removing carriage returns and extra whitespace
                const cleanMessage = message.replace(/\r/g, '').trim();
                
                // If message contains multiple lines, take the last line (most recent progress)
                const lines = cleanMessage.split('\n').filter(line => line.trim());
                const latestLine = lines[lines.length - 1];
                
                // Detect YOLO training progress patterns like "1/2 0G 2.104 0.7667 0.8836 4 832: 0% 0/40 [00:01<?, ?it/s]"
                // More flexible pattern to handle variable spacing and content
                const trainingPattern = /^\s*\d+\/\d+\s+\d+G\s+[\d.]+\s+[\d.]+\s+[\d.]+\s+\d+\s+\d+:\s+\d+%\s+\d+\/\d+\s+\[[^\]]+\]/;
                const trainingMatch = trainingPattern.test(latestLine);
                
                // Detect validation progress patterns like "Class Images Instances Box(P R mAP50 mAP50-95): 100% 5/5 [00:01<00:00, 2.73it/s]"
                const validationPattern = /^Class\s+Images\s+Instances\s+Box\(P\s+R\s+mAP50\s+mAP50-95\):\s+\d+%\s+\d+\/\d+\s+\[[^\]]+\]/;
                const validationMatch = validationPattern.test(latestLine);
                
                // Detect simple progress patterns like "0% 0/40 [00:00<?, ?it/s]" or "2% 1/40 [00:01<00:40, 1.05s/it]"
                const simpleProgressPattern = /^\s*\d+%\s+\d+\/\d+\s+\[[^\]]+\]/;
                const simpleProgressMatch = simpleProgressPattern.test(latestLine);
                
                return {
                    isProgress: trainingMatch || validationMatch || simpleProgressMatch,
                    isTraining: trainingMatch || simpleProgressMatch,
                    isValidation: validationMatch
                };
            };

            // Helper function to add or update message
            const addOrUpdateMessage = (message, progressInfo = { isProgress: false, isTraining: false, isValidation: false }) => {
                // Clean message by removing carriage returns and getting the latest line
                const cleanMessage = message.replace(/\r/g, '').trim();
                const lines = cleanMessage.split('\n').filter(line => line.trim());
                const displayMessage = lines[lines.length - 1] || cleanMessage;
                
                if (progressInfo.isProgress) {
                    if (progressInfo.isTraining && lastTrainingProgressDiv) {
                        // Update existing training progress div with latest progress
                        lastTrainingProgressDiv.textContent = displayMessage;
                    } else if (progressInfo.isValidation && lastValidationProgressDiv) {
                        // Update existing validation progress div with latest progress
                        lastValidationProgressDiv.textContent = displayMessage;
                    } else {
                        // Create new div for progress
                        const newDiv = document.createElement('div');
                        newDiv.textContent = displayMessage;
                        
                        if (progressInfo.isTraining) {
                            newDiv.style.color = '#00ff00'; // Green for training progress
                            newDiv.style.fontWeight = 'normal';
                            lastTrainingProgressDiv = newDiv;
                        } else if (progressInfo.isValidation) {
                            newDiv.style.color = '#00ff00'; // Green for validation progress
                            newDiv.style.fontWeight = 'normal';
                            lastValidationProgressDiv = newDiv;
                        }
                        
                        this.logContainer.appendChild(newDiv);
                    }
                } else {
                    // Create new div for non-progress messages
                    const newDiv = document.createElement('div');
                    newDiv.textContent = displayMessage;
                    this.logContainer.appendChild(newDiv);
                    
                    // Reset both progress tracking when non-progress messages appear
                    // This ensures the next progress message of any type creates a new div
                    lastTrainingProgressDiv = null;
                    lastValidationProgressDiv = null;
                }
            };

            // No timeout for script execution - let it run as long as needed
            // The process will continue on the server even if WebSocket disconnects

            socket.onopen = () => {
                console.log('WebSocket connected, sending script execution request:', { script_path: scriptPath, args: args });
                socket.send(JSON.stringify({ script_path: scriptPath, args: args }));
            };

            socket.onmessage = (event) => {
                const message = event.data;

                if (message === 'EXECUTION_FINISHED') {
                    this.logContainer.innerHTML += `<div style="color: green;"><em>✅ Finished: ${scriptPath}</em></div><hr>`;
                    console.log('Script execution completed, closing WebSocket normally');
                    lastTrainingProgressDiv = null; // Reset progress tracking
                    lastValidationProgressDiv = null; // Reset progress tracking
                    
                    // Mark as completed and close
                    executionCompleted = true;
                    socket.close(1000, 'Execution finished');
                } else if (message.startsWith('EXECUTION_ERROR:')) {
                    this.logContainer.innerHTML += `<div style="color: red; font-weight: bold;">❌ ${message}</div>`;
                    console.error('Script execution error:', message);
                    lastTrainingProgressDiv = null; // Reset progress tracking
                    lastValidationProgressDiv = null; // Reset progress tracking
                    executionFailed = true;
                    socket.close(4000, 'Execution error');
                } else if (message.startsWith('HEARTBEAT:')) {
                    // Filter out heartbeat messages from display
                    console.log('Heartbeat received:', message);
                } else if (message.startsWith('MEMORY_MONITOR:') || message.startsWith('MEMORY_ERROR:') || message.startsWith('MEMORY_FINAL:') || message.startsWith('MEMORY_INITIAL:')) {
                    // Highlight memory monitoring messages with yellow bold font
                    // Don't reset lastProgressDiv - memory messages should not interrupt progress tracking
                    const memoryDiv = document.createElement('div');
                    memoryDiv.style.color = '#FFD700';
                    memoryDiv.style.fontWeight = 'bold';
                    memoryDiv.style.backgroundColor = 'rgba(255, 215, 0, 0.1)';
                    memoryDiv.style.padding = '2px 4px';
                    memoryDiv.style.borderLeft = '3px solid #FFD700';
                    memoryDiv.textContent = message;
                    this.logContainer.appendChild(memoryDiv);
                    
                    // After memory message, prepare for a new progress indicator
                    // This ensures the next progress message creates a fresh progress div
                    if (lastTrainingProgressDiv) {
                        lastTrainingProgressDiv = null; // Reset so next training progress message creates new div
                    }
                    if (lastValidationProgressDiv) {
                        lastValidationProgressDiv = null; // Reset so next validation progress message creates new div
                    }
                } else {
                    // Check if this is a training progress message and handle deduplication
                    const progressInfo = isProgressMessage(message);
                    addOrUpdateMessage(message, progressInfo);
                }
                
                this.logContainer.scrollTop = this.logContainer.scrollHeight;
            };

            socket.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.logContainer.innerHTML += `<div style="color: orange;">⚠️ WebSocket connection error - script continues running on server...</div>`;
                // Don't reject immediately - the process continues on the server
            };

            socket.onclose = (event) => {
                console.log('WebSocket closed with code:', event.code, 'reason:', event.reason);
                
                // Clear active socket reference
                if (this.activeSocket === socket) {
                    this.activeSocket = null;
                }
                
                if (event.code === 4001) {
                    // User cancelled execution
                    reject(new Error('Script execution was cancelled by user'));
                } else if (event.code === 1000 && executionCompleted) {
                    console.log('Script execution completed successfully');
                    resolve();
                } else if (event.code === 1006 && executionCompleted) {
                    // Code 1006 (abnormal closure) but we already received EXECUTION_FINISHED
                    console.log('Script execution completed successfully (abnormal close after completion)');
                    resolve();
                } else if (event.code === 4000 || executionFailed) {
                    // Extract error message from the last EXECUTION_ERROR message
                    const errorMessage = event.reason || 'Script execution failed with unknown error';
                    reject(new Error(errorMessage));
                } else {
                    // For any other disconnection, show a message but continue
                    const infoMsg = `WebSocket disconnected (Code: ${event.code}) - script continues running on server. You can close the browser safely.`;
                    console.log(infoMsg);
                    this.logContainer.innerHTML += `<div style="color: blue;"><strong>ℹ️ Info:</strong> ${infoMsg}</div>`;
                    
                    // Don't reject - just resolve and let the user know the process continues
                    resolve();
                }
            };
        });
    }
}
