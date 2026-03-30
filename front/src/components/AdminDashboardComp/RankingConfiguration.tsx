import React, { useEffect, useState } from 'react';
import { getRankingDecreaseConfig, saveRankingDecreaseConfig } from '../../services/appConfigService';
import './RankingConfiguration.css';

const clampPercent = (value: number) => {
	if (Number.isNaN(value)) return 0;
	if (value < 0) return 0;
	if (value > 100) return 100;
	return value;
};

const RankingConfiguration: React.FC = () => {
	const [percent, setPercent] = useState<number>(10);
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const [loadingConfig, setLoadingConfig] = useState<boolean>(true);
	const [savingConfig, setSavingConfig] = useState<boolean>(false);
	const [configMessage, setConfigMessage] = useState<string>('');

	const handlePercentChange = (rawValue: string) => {
		const parsed = Number(rawValue);
		setPercent(clampPercent(parsed));
	};

	const top5Reduction = Math.max(percent - 2, 0);

	useEffect(() => {
		const loadConfig = async () => {
			try {
				setLoadingConfig(true);
				const loadedPercent = await getRankingDecreaseConfig(10);
				setPercent(loadedPercent);
			} catch (error) {
				console.error('[RankingConfiguration] Error al cargar ranking_decrease:', error);
			} finally {
				setLoadingConfig(false);
			}
		};

		loadConfig();
	}, []);

	const handleSaveConfig = async () => {
		try {
			setSavingConfig(true);
			setConfigMessage('');

			const userStr = localStorage.getItem('user');
			const user = userStr ? JSON.parse(userStr) : null;
			const updatedBy = Number(user?.id);

			if (!Number.isInteger(updatedBy) || updatedBy <= 0) {
				setConfigMessage('No se pudo identificar al administrador.');
				return;
			}

			await saveRankingDecreaseConfig(percent, updatedBy);
			setConfigMessage('Configuración guardada correctamente.');
		} catch (error) {
			console.error('[RankingConfiguration] Error al guardar ranking_decrease:', error);
			setConfigMessage('No se pudo guardar la configuración.');
		} finally {
			setSavingConfig(false);
		}
	};

	return (
		<section className="ranking-config" aria-label="Configuración visual de reducción de ranking">
			<button
				type="button"
				className="ranking-config__toggle"
				onClick={() => setIsOpen((prev) => !prev)}
			>
				<span className="ranking-config__toggle-title">Configuración de reducción de temporada</span>
				<span className={`ranking-config__toggle-icon ${isOpen ? 'is-open' : ''}`}>▼</span>
			</button>

			{isOpen && (
				<div className="ranking-config__content-box">
					{loadingConfig && <div className="ranking-config__inline-msg">Cargando configuración...</div>}
					<div className="ranking-config__layout">
						<div className="ranking-config__controls-panel">
							<div className="ranking-config__field-group">
							<label htmlFor="ranking-reduction-percent" className="ranking-config__label">
								Porcentaje base de reducción
							</label>
							<div className="input-group mt-2 ranking-config__percent-input-wrap">
								<input
									id="ranking-reduction-percent"
									type="number"
									min={0}
									max={100}
									step={1}
									value={percent}
									onChange={(e) => handlePercentChange(e.target.value)}
									className="form-control"
									aria-label="Porcentaje base de reducción"
								/>
								<span className="input-group-text">%</span>
							</div>
							</div>

							<div className="d-flex flex-column flex-sm-row gap-2 ranking-config__actions">
								<button
									type="button"
									className="btn btn-success"
									onClick={handleSaveConfig}
									disabled={savingConfig || loadingConfig}
								>
									{savingConfig ? 'Guardando...' : 'Guardar configuración'}
								</button>
								<button
									type="button"
									className="btn btn-light ranking-config__reset"
									onClick={() => {
										setPercent(10);
										setConfigMessage('');
									}}
								>
									Restablecer
								</button>
							</div>
							{configMessage && <small className="ranking-config__inline-msg">{configMessage}</small>}
						</div>

						<div className="ranking-config__results-panel">
							<div className="ranking-config__result-block">
								<span className="ranking-config__result-title">Top 5</span>
								<strong className="ranking-config__result-value">-{top5Reduction}%</strong>
							</div>
							<div className="ranking-config__result-block">
								<span className="ranking-config__result-title">Resto de usuarios</span>
								<strong className="ranking-config__result-value">-{percent}%</strong>
							</div>
						</div>
					</div>
				</div>
			)}
		</section>
	);
};

export default RankingConfiguration;
