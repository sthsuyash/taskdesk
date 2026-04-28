import { createTask, deleteTask, listTasks, updateTask } from '@/services/tasksApi';
import type { Task, TaskPayload } from '@/types';
import { useCallback, useEffect, useMemo, useState } from 'react';

export function useTasks() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const refresh = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const { tasks: rows } = await listTasks();
            setTasks(rows || []);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load tasks';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const addTask = useCallback(async (payload: TaskPayload) => {
        const { task } = await createTask(payload);
        setTasks((current) => [task, ...current]);
        return task;
    }, []);

    const editTask = useCallback(async (id: string, payload: TaskPayload) => {
        const { task } = await updateTask(id, payload);
        setTasks((current) => current.map((item) => (item.id === id ? task : item)));
        return task;
    }, []);

    const removeTask = useCallback(async (id: string) => {
        await deleteTask(id);
        setTasks((current) => current.filter((item) => item.id !== id));
    }, []);

    const counts = useMemo(() => {
        const done = tasks.filter((task) => task.status === 'done').length;
        return {
            all: tasks.length,
            done,
            todo: tasks.length - done,
        };
    }, [tasks]);

    return {
        tasks,
        loading,
        error,
        refresh,
        addTask,
        editTask,
        removeTask,
        counts,
    };
}
