// ============================================================================
// STORAGE & STATE
// ============================================================================
const STORAGE_KEY = 'pendientes_app_data';

let appState = {
    tasks: [],
    currentScreen: 'home',
    editingTaskId: null,
    swipeTaskId: null,
};

// ============================================================================
// INITIALIZATION
// ============================================================================
window.addEventListener('DOMContentLoaded', () => {
    loadState();
    cleanupExpiredTasks();
    render();
    setupEventListeners();
});

// ============================================================================
// EVENT LISTENERS
// ============================================================================
function setupEventListeners() {
    // Screen navigation
    document.querySelectorAll('[data-screen]').forEach(btn => {
        btn.addEventListener('click', () => {
            const screen = btn.dataset.screen;
            navigateToScreen(screen);
        });
    });

    // Back buttons
    document.querySelectorAll('.back-button').forEach(btn => {
        btn.addEventListener('click', () => navigateToScreen('home'));
    });

    // Add task
    const addToggle = document.getElementById('addToggle');
    const addForm = document.getElementById('addTaskForm');
    const taskInput = document.getElementById('taskInput');

    addToggle.addEventListener('click', () => {
        addForm.classList.toggle('hidden');
        if (!addForm.classList.contains('hidden')) {
            setTimeout(() => taskInput.focus(), 100);
        }
    });

    addForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = taskInput.value.trim();
        if (!text) return;

        addTask(text);
        taskInput.value = '';
        addForm.classList.add('hidden');
        render();
    });

    // Modal
    const modalBackdrop = document.getElementById('modalBackdrop');
    const cancelBtn = document.getElementById('modalCancel');
    const confirmBtn = document.getElementById('modalConfirm');

    modalBackdrop.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    confirmBtn.addEventListener('click', confirmCompletion);

    // Delete all button
    const deleteAllBtn = document.getElementById('deleteAllButton');
    if (deleteAllBtn) {
        deleteAllBtn.addEventListener('click', () => openDeleteAllModal());
    }

    // Task card interactions
    setupTaskInteractions();
}

function setupTaskInteractions() {
    document.querySelectorAll('.task-card').forEach(card => {
        const taskId = card.dataset.taskId;

        // Checkbox
        const checkbox = card.querySelector('.task-checkbox');
        if (checkbox) {
            checkbox.addEventListener('click', () => openConfirmationModal(taskId, 'complete'));
        }

        // Delete button
        const deleteBtn = card.querySelector('.task-delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openDeletePendingModal(taskId);
            });
        }

        // Swipe
        let startX = 0;
        let startY = 0;
        let currentX = 0;

        card.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            currentX = 0;
        });

        card.addEventListener('touchmove', (e) => {
            if (!startX) return;
            const deltaX = e.touches[0].clientX - startX;
            const deltaY = Math.abs(e.touches[0].clientY - startY);

            if (Math.abs(deltaX) > 10 && deltaY < 30) {
                e.preventDefault();
                if (deltaX > 0) {
                    // Swipe right = complete
                    currentX = Math.min(deltaX, 100);
                    card.style.transform = `translateX(${currentX}px)`;
                    card.style.opacity = Math.max(0.7, 1 - currentX / 200);
                } else if (deltaX < 0) {
                    // Swipe left = delete
                    currentX = Math.max(deltaX, -100);
                    card.style.transform = `translateX(${currentX}px)`;
                    card.style.opacity = Math.max(0.7, 1 + currentX / 200);
                }
            }
        }, { passive: false });

        card.addEventListener('touchend', () => {
            if (currentX > 60) {
                openConfirmationModal(taskId, 'complete');
            } else if (currentX < -60) {
                openConfirmationModal(taskId, 'delete');
            }
            card.style.transform = '';
            card.style.opacity = '';
            startX = 0;
        });
    });
}

function setupCompletedInteractions() {
    document.querySelectorAll('.completed-task').forEach(card => {
        const taskId = card.dataset.taskId;

        // Swipe
        let startX = 0;
        let startY = 0;
        let currentX = 0;

        card.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            currentX = 0;
        });

        card.addEventListener('touchmove', (e) => {
            if (!startX) return;
            const deltaX = e.touches[0].clientX - startX;
            const deltaY = Math.abs(e.touches[0].clientY - startY);

            if (Math.abs(deltaX) > 10 && deltaY < 30) {
                e.preventDefault();
                if (deltaX > 0) {
                    // Swipe right = recover
                    currentX = Math.min(deltaX, 100);
                    card.style.transform = `translateX(${currentX}px)`;
                    card.style.opacity = Math.max(0.7, 1 - currentX / 200);
                } else if (deltaX < 0) {
                    // Swipe left = delete
                    currentX = Math.max(deltaX, -100);
                    card.style.transform = `translateX(${currentX}px)`;
                    card.style.opacity = Math.max(0.7, 1 + currentX / 200);
                }
            }
        }, { passive: false });

        card.addEventListener('touchend', () => {
            if (currentX > 60) {
                recoverTask(taskId);
            } else if (currentX < -60) {
                openDeleteCompletedModal(taskId);
            }
            card.style.transform = '';
            card.style.opacity = '';
            startX = 0;
        });
    });
}

// ============================================================================
// SCREEN NAVIGATION
// ============================================================================
function navigateToScreen(screenName) {
    const currentScreenEl = document.querySelector('.screen-active');
    const newScreenEl = document.getElementById(`screen-${screenName}`);

    if (!newScreenEl || screenName === appState.currentScreen) return;

    // Slide out current
    currentScreenEl?.classList.remove('screen-active');

    // Slide in new
    requestAnimationFrame(() => {
        newScreenEl.classList.add('screen-active');
        appState.currentScreen = screenName;
        render();

        // Focus input if on pendientes
        if (screenName === 'pendientes') {
            setTimeout(() => {
                document.getElementById('taskInput')?.focus?.();
            }, 400);
        }
    });
}

// ============================================================================
// TASK OPERATIONS
// ============================================================================
function addTask(text) {
    const task = {
        id: crypto.randomUUID(),
        text,
        createdAt: Date.now(),
        completed: false,
        completedAt: null,
    };
    appState.tasks.push(task);
    saveState();
}

function completeTask(taskId) {
    const task = appState.tasks.find(t => t.id === taskId);
    if (!task) return;

    task.completed = true;
    task.completedAt = Date.now();
    saveState();
    render();
}

function deleteTask(taskId) {
    appState.tasks = appState.tasks.filter(t => t.id !== taskId);
    saveState();
    render();
}

function deleteAllCompleted() {
    appState.tasks = appState.tasks.filter(t => !t.completed);
    saveState();
    render();
}

function recoverTask(taskId) {
    const task = appState.tasks.find(t => t.id === taskId);
    if (!task) return;

    task.completed = false;
    task.completedAt = null;
    saveState();
    render();
}

function deleteCompletedTask(taskId) {
    appState.tasks = appState.tasks.filter(t => t.id !== taskId);
    saveState();
    render();
}

// ============================================================================
// MODAL
// ============================================================================
let pendingTaskId = null;
let pendingAction = null;

function openConfirmationModal(taskId, action = 'complete') {
    pendingTaskId = taskId;
    pendingAction = action;
    const modal = document.getElementById('confirmationModal');
    const backdrop = document.getElementById('modalBackdrop');
    const title = document.getElementById('modalTitle');
    const confirmBtn = document.getElementById('modalConfirm');

    if (action === 'delete') {
        title.textContent = '¿ELIMINAR PENDIENTE?';
        confirmBtn.textContent = 'ELIMINAR';
    } else {
        title.textContent = '¿COMPLETAR?';
        confirmBtn.textContent = 'COMPLETAR';
    }

    modal.classList.add('active');
    backdrop.classList.add('active');
}

function closeModal() {
    const modal = document.getElementById('confirmationModal');
    const backdrop = document.getElementById('modalBackdrop');

    modal.classList.remove('active');
    backdrop.classList.remove('active');
    pendingTaskId = null;
    pendingAction = null;
}

function confirmCompletion() {
    if (pendingAction === 'deleteAll') {
        deleteAllCompleted();
    } else if (pendingAction === 'deleteCompleted') {
        deleteCompletedTask(pendingTaskId);
    } else if (pendingAction === 'deletePending') {
        deleteTask(pendingTaskId);
    } else if (pendingTaskId) {
        if (pendingAction === 'delete') {
            deleteTask(pendingTaskId);
        } else {
            completeTask(pendingTaskId);
        }
    }
    closeModal();
}

function openDeleteAllModal() {
    const modal = document.getElementById('confirmationModal');
    const backdrop = document.getElementById('modalBackdrop');
    const title = document.getElementById('modalTitle');
    const confirmBtn = document.getElementById('modalConfirm');

    pendingAction = 'deleteAll';
    title.textContent = '¿ELIMINAR TODOS?';
    confirmBtn.textContent = 'ELIMINAR TODO';

    modal.classList.add('active');
    backdrop.classList.add('active');
}

function openDeleteCompletedModal(taskId) {
    const modal = document.getElementById('confirmationModal');
    const backdrop = document.getElementById('modalBackdrop');
    const title = document.getElementById('modalTitle');
    const confirmBtn = document.getElementById('modalConfirm');

    pendingTaskId = taskId;
    pendingAction = 'deleteCompleted';
    title.textContent = '¿ELIMINAR ESTE COMPLETADO?';
    confirmBtn.textContent = 'ELIMINAR';

    modal.classList.add('active');
    backdrop.classList.add('active');
}

function openDeletePendingModal(taskId) {
    const modal = document.getElementById('confirmationModal');
    const backdrop = document.getElementById('modalBackdrop');
    const title = document.getElementById('modalTitle');
    const confirmBtn = document.getElementById('modalConfirm');

    pendingTaskId = taskId;
    pendingAction = 'deletePending';
    title.textContent = '¿ELIMINAR PENDIENTE?';
    confirmBtn.textContent = 'ELIMINAR';

    modal.classList.add('active');
    backdrop.classList.add('active');
}

// ============================================================================
// RENDERING
// ============================================================================
function render() {
    updateHomeCounters();
    renderPendingTasks();
    renderCompletedTasks();
    setupTaskInteractions();
}

function updateHomeCounters() {
    const pending = appState.tasks.filter(t => !t.completed).length;
    const completed = appState.tasks.filter(t => t.completed).length;

    document.getElementById('home-pending-count').textContent = String(pending).padStart(2, '0');
    document.getElementById('home-completed-count').textContent = String(completed).padStart(2, '0');
}

function renderPendingTasks() {
    const tasksList = document.getElementById('tasksList');
    const emptyState = document.getElementById('emptyState');
    const pendingTasks = appState.tasks.filter(t => !t.completed);

    tasksList.innerHTML = '';

    if (pendingTasks.length === 0) {
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    pendingTasks.forEach(task => {
        const li = document.createElement('li');
        li.className = 'task-card';
        li.dataset.taskId = task.id;

        li.innerHTML = `
            <div class="task-checkbox"></div>
            <div class="task-text">${escapeHtml(task.text)}</div>
            <button class="task-delete-btn" aria-label="Eliminar tarea">×</button>
        `;

        tasksList.appendChild(li);
    });
}

function renderCompletedTasks() {
    const completedList = document.getElementById('completedList');
    const emptyState = document.getElementById('emptyCompletedState');
    const completedTasks = appState.tasks.filter(t => t.completed);

    completedList.innerHTML = '';

    if (completedTasks.length === 0) {
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    completedTasks.forEach(task => {
        const li = document.createElement('li');
        li.className = 'completed-task';
        li.dataset.taskId = task.id;

        const timeStr = new Date(task.completedAt).toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
        });

        const timeRemaining = getTimeRemaining(task.completedAt);

        li.innerHTML = `
            <span class="completed-task-text">${escapeHtml(task.text)}</span>
            <span class="completed-task-time">COMPLETADO ${timeStr}</span>
            ${timeRemaining ? `<span class="completed-task-remaining">SE ELIMINA EN ${timeRemaining}</span>` : ''}
        `;

        completedList.appendChild(li);
    });

    setupCompletedInteractions();
}

// ============================================================================
// UTILITIES
// ============================================================================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getTimeRemaining(completedAt) {
    const now = Date.now();
    const elapsed = now - completedAt;
    const twentyFourHours = 24 * 60 * 60 * 1000;
    const remaining = twentyFourHours - elapsed;

    if (remaining <= 0) return null;

    const hours = Math.floor(remaining / (60 * 60 * 1000));
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));

    if (hours > 0) {
        return `${hours}H`;
    }
    return `${minutes}M`;
}

// ============================================================================
// PERSISTENCE
// ============================================================================
function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState.tasks));
}

function loadState() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            appState.tasks = JSON.parse(stored);
        } catch (e) {
            console.error('Failed to load state:', e);
            appState.tasks = [];
        }
    }
}

// ============================================================================
// CLEANUP
// ============================================================================
function cleanupExpiredTasks() {
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;

    const before = appState.tasks.length;
    appState.tasks = appState.tasks.filter(task => {
        if (!task.completed || !task.completedAt) return true;
        return now - task.completedAt < twentyFourHours;
    });
    const after = appState.tasks.length;

    if (before !== after) {
        saveState();
    }
}

// Cleanup periodically
setInterval(cleanupExpiredTasks, 60000);

// PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
}
