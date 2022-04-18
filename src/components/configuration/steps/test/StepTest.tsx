import React, {CSSProperties, useEffect, useMemo, useState} from "react";
import "./StepTest.scss";
import {Button, Col, Container, Image, Row, Toast, ToastContainer} from "react-bootstrap";
import {ArrowLeft, X} from "react-bootstrap-icons";
import {ConfigurationStep, HooverOrientation, IHooverConfiguration} from "../../Configuration";
import {startLongPressTimeout} from "../../../../utils/utils";
import InstructionsForm from "./InstructionsForm";

/**
 * Hoover instruction
 */
export enum HooverInstruction {
	GoFront, RotateLeft, RotateRight
}

/**
 * Animation configuration
 */
interface IAnimationConfiguration {
	x: number,
	y: number,
	angle: number
}

/**
 * Execution result
 */
interface IExecutionResult {
	xLocation: number,
	yLocation: number,
	orientation: string
}

/**
 * Test configuration props
 */
interface ITestConfigurationProps {
	step: ConfigurationStep,
	render: boolean,
	showPreviousStep: (hooverConfiguration: IHooverConfiguration) => () => void,
	hooverConfiguration: IHooverConfiguration
}

let animationInterval: NodeJS.Timer | null = null;

/**
 * Test configuration step
 */
const StepTest = (props: ITestConfigurationProps) => {
	const [_gridHeight] = useState<number>(300);
	const [_gridWidth] = useState<number>(400);
	const [_grid, _setGrid] = useState<Array<Array<string>>>(new Array<Array<string>>())
	const [_cellSize, _setCellSize] = useState<number>(0);
	const [_allowTransitions, _setAllowTransitions] = useState<boolean>(false);
	const [_instructions, _setInstructions] = useState<Array<HooverInstruction>>(new Array<HooverInstruction>());
	const [_maxInstructions] = useState<number>(30);
	const [_animationConfiguration, _setAnimationConfiguration] = useState<IAnimationConfiguration | null>(null);
	const [_executionResult, _setExecutionResult] = useState<IExecutionResult | null>(null);
	const [_showExecutionResult, _setShowExecutionResult] = useState<boolean>(false);

	/**
	 * On render
	 */
	useEffect(() => {
		if (!props.render) return;
		_setAllowTransitions(false);
		setTimeout(() => _setAllowTransitions(true), 300);
		const isSameGrid = props.hooverConfiguration.roomLength === _grid.length &&
			props.hooverConfiguration.roomWidth === _grid[0].length;
		if (isSameGrid) return;
		const rows = Array.from(Array(props.hooverConfiguration.roomLength).keys());
		const columns = Array.from(Array(props.hooverConfiguration.roomWidth).keys());
		const grid = rows.map(row => columns.map(column => row + "," + column));
		const cellSize = getCellSize(props.hooverConfiguration.roomLength, props.hooverConfiguration.roomWidth);
		_setCellSize(cellSize);
		_setGrid(grid);
	}, [props.render])

	/**
	 * On execution result has changed
	 */
	useEffect(() => {
		if (!!_executionResult) _setShowExecutionResult(true);
	}, [_executionResult])

	/**
	 * Get cell size
	 * @param rows number of rows
	 * @param columns number of columns
	 */
	const getCellSize = (rows: number, columns: number): number => {
		const height = _gridHeight / rows;
		const width = _gridWidth / columns;
		return width > height ? height : width;
	}

	/**
	 * On add instruction
	 */
	const onAddInstruction = (instruction: HooverInstruction) => () => {
		const action = () => _setInstructions(prevInstructions => {
			if (prevInstructions.length === _maxInstructions) return prevInstructions;
			return [...prevInstructions, instruction];
		});
		startLongPressTimeout(action);
		action();
	}

	/**
	 * On remove instruction
	 */
	const onRemoveInstruction = () => {
		const action = () => _setInstructions(prevInstructions => {
			if (prevInstructions.length <= 0) return prevInstructions;
			const instructions = [...prevInstructions];
			instructions.length -= 1;
			return instructions;
		});
		startLongPressTimeout(action, 50);
		action();
	}

	/**
	 * On execute instructions
	 */
	const onExecuteInstructions = () => {
		if (_instructions.length === 0) return;
		_setShowExecutionResult(false);
		_setAnimationConfiguration(null);
		let instructionIndex = 0;
		animateInstruction(_instructions[instructionIndex]);
		++instructionIndex;
		animationInterval = setInterval(() => {
			if (instructionIndex < _instructions.length) {
				animateInstruction(_instructions[instructionIndex]);
				++instructionIndex;
			} else {
				if (!!animationInterval) clearInterval(animationInterval);
				setTimeout(() => _setAnimationConfiguration(prevConfig => {
					if (!prevConfig) return null;
					const orientation = getOrientationFromAngle(prevConfig.angle);
					const orientationLabel = HooverOrientation[orientation];
					_setExecutionResult({
						xLocation: prevConfig.x,
						yLocation: prevConfig.y,
						orientation: orientationLabel
					});
					return null;
				}), 1000);
			}
		}, 1000);
	}

	/**
	 * On stop instructions execution
	 */
	const onStopInstructionsExecution = () => {
		_setAnimationConfiguration(null);
		if (!!animationInterval) clearInterval(animationInterval);
	}

	/**
	 * Animate instruction
	 * @param instruction
	 */
	const animateInstruction = (instruction: HooverInstruction) => {
		_setAnimationConfiguration(prevConfig => {
			const animationConfiguration: IAnimationConfiguration = !!prevConfig ? {...prevConfig} : {
				x: props.hooverConfiguration.xLocation,
				y: props.hooverConfiguration.yLocation,
				angle: props.hooverConfiguration.orientation
			}
			console.log(animationConfiguration)
			switch (instruction) {
				case HooverInstruction.GoFront:
					const orientation = getOrientationFromAngle(animationConfiguration.angle);
					let x = animationConfiguration.x;
					let y = animationConfiguration.y;
					switch (orientation) {
						case HooverOrientation.North:
							y += 1;
							if (y < props.hooverConfiguration.roomLength) animationConfiguration.y = y;
							break;
						case HooverOrientation.East:
							x += 1;
							if (x < props.hooverConfiguration.roomWidth) animationConfiguration.x = x;
							break;
						case HooverOrientation.South:
							y -= 1;
							if (y >= 0) animationConfiguration.y = y;
							break;
						case HooverOrientation.West:
							x -= 1;
							if (x >= 0) animationConfiguration.x = x;
							break;
					}
					break;
				case HooverInstruction.RotateLeft:
					animationConfiguration.angle -= 90;
					break;
				case HooverInstruction.RotateRight:
					animationConfiguration.angle += 90;
					break;

			}
			return animationConfiguration;
		})
	}

	/**
	 * Get orientation from angle
	 * @param angle angle in degrees
	 */
	const getOrientationFromAngle = (angle: number): HooverOrientation => {
		const rest = angle % 360;
		if (rest === 0) return HooverOrientation.North;
		else if (rest === 90 || rest === -270) return HooverOrientation.East;
		else if (rest === 180 || rest === -180) return HooverOrientation.South;
		else if (rest === 270 || rest === -90) return HooverOrientation.West;
		return HooverOrientation.North;
	}

	/**
	 * Get hoover style properties
	 */
	const getHooverStyle = (): CSSProperties => {
		if (!!_animationConfiguration) {
			return {
				bottom: (_animationConfiguration.y * _cellSize) + "px",
				left: (_animationConfiguration.x * _cellSize) + "px",
				transform: "rotate(" + _animationConfiguration.angle + "deg) scale(0.7)"
			};
		}
		return {
			bottom: (props.hooverConfiguration.yLocation * _cellSize) + "px",
			left: (props.hooverConfiguration.xLocation * _cellSize) + "px",
			transform: "rotate(" + props.hooverConfiguration.orientation + "deg) scale(0.7)"
		};
	}

	/**
	 * On close execution result
	 */
	const onCloseExecutionResult = () => _setShowExecutionResult(false);

	/**
	 * Render grid
	 */
	const renderGrid = useMemo(() => {
		return _grid.map((row, rowIndex) => (
			<div key={"row-" + rowIndex} className={"room-grid-row"}>
				{row.map((column, columnIndex) => (
					<div key={"column-" + columnIndex} className={"room-grid-cell"}
					     style={{width: _cellSize + "px", height: _cellSize + "px"}}>
					</div>
				))}
			</div>
		))
	}, [_grid]);

	/**
	 * Render execution result
	 */
	const renderExecutionResult = useMemo(() => {
		return (
			<ToastContainer position={"bottom-end"}>
				<Toast show={_showExecutionResult} onClose={onCloseExecutionResult} delay={10000} autohide>
					<Toast.Body className={"d-flex flex-column"}>
						<div className={"d-flex justify-content-between"}>
							<span className={"toast-title"}>
								Execution has ended
							</span>
							<X className={"close"} size={25} onClick={onCloseExecutionResult}/>
						</div>
						{!!_executionResult ?
							<div className={"d-flex gap-2"}>
								<span>
									Position (X,Y): <strong>{_executionResult.xLocation + 1},{_executionResult.yLocation + 1}</strong>
								</span>
								<span>
									Orientation: <strong>{_executionResult.orientation}</strong>
								</span>
							</div>
							:
							null
						}
					</Toast.Body>
				</Toast>
			</ToastContainer>
		)
	}, [_showExecutionResult])

	return useMemo(() => {
		const gridStyles = {
			maxHeight: _gridHeight + "px", minHeight: _gridHeight + "px",
			maxWidth: _gridWidth + "px", minWidth: _gridWidth + "px",
		}
		return (
			<div id={props.step} className={"fullscreen-window " + (_allowTransitions ? "" : "no-transition")}>
				<Button className={"go-back-btn"} onClick={props.showPreviousStep(props.hooverConfiguration)}>
					<ArrowLeft size={30}/>
				</Button>
				<Container fluid className={"h-100 d-flex align-items-center justify-content-center"}>
					<Row className={"d-flex align-items-center justify-content-center"}>
						<Col className={"col-12 text-center mb-4"}>
							<h2>Test your configuration</h2>
							<span>Select actions and click start to execute them</span>
							<InstructionsForm
								hooverConfiguration={props.hooverConfiguration}
								instructions={_instructions}
								isAnimationInProgress={!!_animationConfiguration}
								onRemoveInstruction={onRemoveInstruction}
								onAddInstruction={onAddInstruction}
								onStopInstructionsExecution={onStopInstructionsExecution}
								onExecuteInstructions={onExecuteInstructions}
								maxInstructions={_maxInstructions}
							/>
						</Col>
						<Col className={"col-12 room-grid"} style={gridStyles}>
							<div className={"room-grid-delimiter"}>
								{renderGrid}
								<div className={"ihoover"} style={getHooverStyle()}>
									<Image width={_cellSize + "px"} height={_cellSize + "px"} src={"/ihoover.svg"}/>
								</div>
							</div>
						</Col>
					</Row>
				</Container>
				{renderExecutionResult}
			</div>
		)
	}, [props.hooverConfiguration, _grid, _allowTransitions, _instructions, _animationConfiguration, _showExecutionResult]);
}

export default StepTest;