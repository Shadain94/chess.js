var game;
var pieceIds;
var file = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
var order = [4, 2, 3, 5, 6, 3, 2, 4];
var moveHistory;
var pieceTypes = ['-', 'P', 'N', 'B', 'R', 'Q', 'K'];
var gameNotation;
var noPiece = 0;
var numSquares = 64;
var sliceNum = 20;
var rookPaths = [-8, -1, 1, 8];
var bishopPaths = [-9, -7, 7, 9];
var whitePawnPaths = [7, 9];
var blackPawnPaths = [-7, -9];
var queenPaths = [-9, -8, -7, -1, 1, 7, 8, 9];
var kingPaths = [-9, -8, -7, -1, 1, 7, 8, 9];
var knightPaths = [-17,-15,-10,-6, 6, 10, 15, 17];
var pieceValues = [0, 100, 300, 325, 500, 900, 3950]; 
var winScore = 100000;
var squaresWeight = 5;
var bestMoves;
var bestMoveTable = {};
var allPieceMoves = [];
var scoreTable = {};
var numCalls = {eval:0, p:0, k:0, n:0, vMoves:0, check:0, umt:0, aMoves:0, mtdF:0};
var currentSide, pendingMove;
init();
function init(){
	moveHistory=[];
	gameNotation = [];
	currentSide=1;
	pendingMove = false;
	pieceIds = [];
	for(var i=0; i<8; i++){
		pieceIds[i] = order[i];
		pieceIds[i+8] 	= 1;

		pieceIds[i+16] 	= 0;
		pieceIds[i+24] 	= 0;
		pieceIds[i+32] 	= 0;
		pieceIds[i+40] 	= 0;

		pieceIds[i+48] 	= -1;
		pieceIds[i+56] = -order[i];
	}
	pieceIds[64] = 0;
	pieceIds[65] = 0;
	pieceIds[66] = 0;
	pieceIds[67] = 0;
	pieceIds[68] = 0;
	pieceIds[69] = 0;
	game = [pieceIds.slice()];
	generateAllMovesTable();
	setupBoard(pieceIds);
	updateStatus();

}

function findValidMoves(pieceIds, noCheckAllowed){
	var validMoves = [];
	for(var i=0; i<numSquares; i++){
		if(pieceIds[i]!==0){
			validMoves.push(findValidPieceMoves(pieceIds,i,noCheckAllowed));
		}else{
			validMoves.push([]);
		}
	}
	return validMoves;
}

function findAllMoves(pieceIds){
	var allMoves = [];
	for(var i=0; i<numSquares; i++){
		if(pieceIds[i]===0){
			allMoves.push([]);
		}else{
			allMoves.push(findAllPieceMoves(pieceIds,i));
		}
	}
	return allMoves;
}

function groupPieceIdsByType(pieceIds){
	var types = [[],[],[],[],[],[]];
	for(var i=0; i<numSquares; i++){
		if(pieceIds[i]!==0){
			types[Math.abs(pieceIds[i]) - 1].push(i);
		}
	}
	return types;
}

function evaluateScore(pieceIds, allMoves, side){
		var score;
		numCalls.eval++;
		var mobilityScore = 0;
		var materialScore = 0;
		var kingFreedomScore = 0;
		var pieceId;
		var validMoves; 
		var whitePieceCount = 0;
		var blackPieceCount = 0;
		for(var i=0; i<numSquares; i++){
			pieceId = pieceIds[i];
			if(pieceId>0){
				whitePieceCount++;
				if(pieceId!== 6){
					mobilityScore+= allMoves[i].length;
				}
				materialScore+= pieceValues[pieceId];
			}else if(pieceId<0){
				blackPieceCount++;
				if(pieceId!==-6){
					mobilityScore-= allMoves[i].length;
				}
				materialScore-= pieceValues[-pieceId];
			}
			
		}
		if(whitePieceCount<2){
			kingFreedomScore+= kingFreedom(pieceIds, 1, allMoves, findPieceId(pieceIds, 6))-numSquares;
		}
		if(blackPieceCount<2){
			kingFreedomScore-= kingFreedom(pieceIds, -1, allMoves, findPieceId(pieceIds, -6))-numSquares;
		}	
		score = (mobilityScore*squaresWeight+materialScore+kingFreedomScore*2);
		return score*side;
}

function generateAllMovesTable(){
	var hash, vectors, numPaths, positions, rayMoves;
	for(var i=0; i<7; i++){
		for(var j=0; j<numSquares; j++){
			hash = i*numSquares+j;
			positions = [];
			numPaths = 4;
			switch(i){
				case 0: vectors = blackPawnPaths; numPaths = 2; break
				case 1: vectors = whitePawnPaths; numPaths = 2; break;
				case 2: vectors = knightPaths; numPaths = 8; break;
				case 3: vectors = bishopPaths; break;
				case 4: vectors = rookPaths; break;
				
				case 5: 
				case 6: 
					vectors = queenPaths; numPaths = 8; break;
			}
			if(i>=3 && i<=5){
				for(var k=0; k<numPaths; k++){
					pos = j;
					rayMoves = [];
					while(pos!==-1){
						pos = adjustPosition(pos, vectors[k]);
						if(pos!==-1){
							rayMoves.push(pos);
						}
					}
					if(rayMoves.length>0){
						positions.push(rayMoves);
					}
				}
			}else{
				for(var k=0; k<numPaths; k++){
					pos = adjustPosition(j, vectors[k]);
					if(pos!==-1){
						positions.push(pos);
					}
				}
			}
			allPieceMoves[hash] = positions;
		}
	}
}

function findAllPieceMoves(pieceIds, position){
	numCalls.aMoves++;
	var pos = position;
	var pieceId = pieceIds[pos];
	if(pieceId===-1){
		return allPieceMoves[pos];
	}
	var typeId = Math.abs(pieceId);
	var hash = typeId*numSquares+pos;
	var numMoves, numPaths;
	var positions;
	var vectors, p, j;
	var possibleMoves, possibleRays;
	if(typeId>=3 && typeId<=5){
		possibleRays = allPieceMoves[hash];
		positions = [];
		numPaths = possibleRays.length;
		for(var i=0; i<numPaths; i++){
			possibleMoves = possibleRays[i];
			numMoves = possibleMoves.length;
			j=0;
			p=noPiece;
			while(p===noPiece && j<numMoves){		
				p = pieceIds[possibleMoves[j]];
				positions.push(possibleMoves[j]);
				j++;
			}
		}
		return positions;
	}else{
		return allPieceMoves[hash];
	}
}

function checkRelations(posArray, pieceType){
  var valid;
  var numPos = posArray.length;
	if(pieceType==='R'){
		valid = true;
		for(var i=1; i<numPos; i++){
			if(posArray[i]%8!==posArray[0]%8){valid=false; break;}
		}
		if(!valid){
			valid = true;
			for(var i=1; i<numPos; i++){
				if(posArray[i]>>3!==posArray[0]>>3){valid=false; break;}
			}
		}
		return valid;
	}else if(pieceType==='B'){
		valid = true;
		for(var i=1; i<numPos; i++){
			if(posArray[i]%8 + posArray[i]>>3 !== posArray[0]%8 + posArray[0]>>3){valid=false; break;}
		}
		if(!valid){
			valid = true;
			for(var i=1; i<numPos; i++){
				if(posArray[i]%8 + posArray[i]>>3 !== posArray[0]%8 + posArray[0]>>3){valid=false; break;}
			}
		}
		return valid;
	}else if(pieceType==='Q'){
		return checkRelations(posArray, 'R') || checkRelations(posArray, 'B');
	}else{
		return false;
	}
	
}

function generateMoveList(pieceIds, side, noCheckAllowed){
	var moveList = [];
	for(var i=0; i<numSquares; i++){
		var pieceId = pieceIds[i]
		if(pieceId*side>0){
			var options = findValidPieceMoves(pieceIds, i, noCheckAllowed); 
			var moves = options[0];
			var captures = options[1];
			for(var j=0; j<captures.length; j++){
				moveList.push([pieceId, i, captures[j]]);
			}
			for(var j=0; j<moves.length; j++){
				moveList.push([pieceId, i, moves[j]]);
			}
		}
	}
	return moveList;
}

function genControllingList(pieceIds, allMoves){
	var controllingPieces = [];
	var typeId, numMoves;
	for(var i=0; i<numSquares; i++){
		controllingPieces[i] = [];
	}
	for(var i=0; i<numSquares; i++){
		numMoves = allMoves[i].length;
		for(var j=0; j<numMoves; j++){
			controllingPieces[allMoves[i][j]].push(i);
		}
	}
	return controllingPieces;
}

function scoreMove(pieceIds, move, allMoves, controllingList, side, depth, maxDepth, a, b){
	var moveOrigin = move[1];
	var moveDest = move[2];
	var destId = pieceIds[moveDest];
	var capturedPiece;
	var pieceId;
	var numMoves, controllingPieces;
	capturedPiece = makeMove(pieceIds, move, allMoves);
	updateMoveTable(pieceIds, allMoves, controllingList, moveOrigin, moveDest);
	if(depth>0){
		newScore = -findBestMove(pieceIds,allMoves, -side, depth,maxDepth, -b, -a)[2];
	}else{
		pieceId = pieceIds[moveDest];
		
		controllingPieces = controllingList[moveDest];
		numMoves = controllingPieces.length;
		for(var i=0; i<numMoves; i++){
			if(pieceIds[controllingPieces[i]]*side<0){
				pieceIds[moveDest] = 0;
				break;
			}
		}
		newScore = evaluateScore(pieceIds, allMoves, side);	
		pieceIds[moveDest] = pieceId;
		if(newScore>0){
			newScore-= maxDepth - depth - 1;
		}else{
			newScore+= maxDepth - depth - 1;
		} 
	}
	undoMove(pieceIds, move, capturedPiece, allMoves);
	updateMoveTable(pieceIds, allMoves, controllingList, moveDest, moveOrigin);
	return newScore;
}

function sortMoves(pieceIds, moveList, allMoves, controllingList, side, depth, maxDepth, a, b){
	var numMoves;
	var sortedMoves = [];
	var scores = [];
	var move;
	var j;
	numMoves = moveList.length;
	for(var i=0; i<numMoves; i++){	
		move = moveList[i];
		newScore = scoreMove(pieceIds, move, allMoves, controllingList, side, depth-1, maxDepth, a, b);
		j = i;
		while(j >= 1 && scores[j-1] < newScore){
			scores[j] = scores[j-1]
			sortedMoves[j] = sortedMoves[j-1];	
			j--;
		}	
		scores[j] = newScore;
		sortedMoves[j] = move;
	}
	return sortedMoves;
}

function findBestMove(pieceIds, allMoves, side, depth, maxDepth, a, b){
	var a_old = a;
	var deep = depth>1;
	if(deep){
		var hash = side.toString()+pieceIds.toString();
		if(bestMoveTable[hash]!=null && bestMoveTable[hash][0]>=depth){
			var entryMoves = bestMoveTable[hash];
			var entryLimit = entryMoves[1];
			if(entryLimit===0){
				return entryMoves;
			}else if(entryLimit===-1){
				if(entryMoves[2]>a){
					a = entryMoves[2];
				}
			}else if(entryLimit===1){
				if(entryMoves[2]<b){
					b = entryMoves[2];
				}
			}
			if(a>=b){
				return entryMoves;
			}
		}
	}
	var bestScore = -winScore;
	var bestMoves = [];
	bestMoves[0] = depth;
	var newScore,controllingList, moveList, numMoves, move;
	moveList = generateMoveList(pieceIds,side, depth>maxDepth-2);	
	numMoves = moveList.length;
	if(numMoves===0){ 
		bestMoves[1] = 0;
		if(detectCheck(pieceIds, side)){
			bestMoves[2] = bestScore+maxDepth-depth-1;
		}else{
			bestMoves[2] = 0;
		}
		bestMoveTable[hash] = bestMoves;
		return bestMoves;
	}
	controllingList = genControllingList(pieceIds, allMoves);
	if(deep){
		moveList = sortMoves(pieceIds, moveList, allMoves, controllingList, side, depth>>1, maxDepth, a, b);
	}
	
	for(var i=0; i<numMoves; i++){
		move = moveList[i];	
		newScore = scoreMove(pieceIds, move, allMoves, controllingList, side, depth-1, maxDepth, a, b);
		if(newScore>bestScore){
			bestScore = newScore;
			bestMoves[3] = move[0];
			bestMoves[4] = move[1];
			bestMoves[5] = move[2];
			if(bestScore>a){a = bestScore;}
		}
		if(a>=b){
			break;
		}
	}
	
	bestMoves[2] = bestScore;
	
	if(deep){	
		if(bestScore<=a_old){
			bestMoves[1] = 1;
		}else if(bestScore>=b){
			bestMoves[1] = -1;
		}else{
			bestMoves[1] = 0;
		}
		bestMoveTable[hash] = bestMoves;
	}
	return bestMoves;
}

function makeMove(pieceIds, move, allMoves){
	var id = move[0];
	var type = Math.abs(id);
	var moveOrigin = move[1];
	var moveDest = move[2];
	var delta = [];
	var captureMade = pieceIds[moveDest]!==noPiece;
	pieceIds[moveOrigin] = noPiece;
	if(captureMade){
		delta = [0, moveDest, pieceIds[moveDest], allMoves[moveDest]];
	}
	pieceIds[moveDest] = id;
	if(type===1){
		if(!captureMade){
			var dPos = moveDest - moveOrigin;
			if(dPos!==8*id && dPos!==16*id){
				var capturePos = ((moveOrigin>>3)<<3) + moveDest&7;
				delta = [0, capturePos, pieceIds[capturePos], allMoves[capturePos]];
				pieceIds[capturePos] = noPiece;
				allMoves[capturePos] = [];
			}
		}
		var rank = moveDest>>3;
		if(rank===0 || rank===7){
			pieceIds[moveDest] = 5*id;
		}
	}
	else if(type===4){
		var side = Math.sign(id);
		var rank = 28 - 28*side;
		var castlingIndex = 65.5-1.5*side;
		if(moveOrigin===rank && pieceIds[castlingIndex+1] === 0){
			pieceIds[castlingIndex+1] = 1;
			delta[0] = 1;
		}else if(moveOrigin===rank+7 && pieceIds[castlingIndex+2]===0){
			pieceIds[castlingIndex+2] = 1;
			delta[0] = 1;
		}
	}
	else if(type===6){ 
		var side = Math.sign(id);
		var rank = 28 - 28*side;
		var castlingIndex = 65.5-1.5*side;
		
		if(moveOrigin === 4 + rank){
			if(pieceIds[castlingIndex] === 0){
				pieceIds[castlingIndex] = 1;
				delta[0] = 1;
			}	
			if(moveDest === 2 + rank){
				pieceIds[rank] = noPiece;
				pieceIds[3+rank] = 4*side;
				pieceIds[castlingIndex+1] = 1;
				allMoves[rank] = [];
				allMoves[3+rank] = findAllPieceMoves(pieceIds,3+rank);
			}	
			if(moveDest===6+rank){
				pieceIds[7+rank] = noPiece;
				pieceIds[5+rank] = 4*side;
				pieceIds[castlingIndex+2] = 1;
				allMoves[7+rank] = [];
				allMoves[5+rank] = findAllPieceMoves(pieceIds,5+rank);
			}
		}
	}
	return delta;
}

function undoMove(pieceIds, move, capture, allMoves){
	var id = move[0];
	var side = Math.sign(id);
	var type = Math.abs(id);
	var moveOrigin = move[1];
	var moveDest = move[2];
	pieceIds[moveDest] = noPiece;
	if(capture && capture.length>1){
		//console.log(capture);
		pieceIds[capture[1]] = capture[2];
		allMoves[capture[1]] = capture[3];
	}
	var rank = 28 - 28*side;
	if(type===4){
		if(capture && capture[0]===1){
			var castlingIndex  = 65.5-1.5*side;
			if(moveOrigin ===rank){
				pieceIds[castlingIndex+1] = 0;
			}else if(moveOrigin===rank+7){
				pieceIds[castlingIndex+2] = 0;
			}	
		}
	}

	pieceIds[moveOrigin] = id;
	if(type===6 && moveOrigin === 4 + rank){
		var castlingIndex  = 65.5-1.5*side;
		if(capture && capture[0]===1){
			pieceIds[castlingIndex] = 0;
		}
		if(moveDest === 2 + rank){
			pieceIds[castlingIndex] = 0;
			pieceIds[castlingIndex+1] = 0;
			pieceIds[rank] = 4*side;
			pieceIds[3+rank] = noPiece;
			allMoves[rank] = findAllPieceMoves(pieceIds,rank);
			allMoves[3+rank] = [];
		}	
		if(moveDest===6+rank){
			pieceIds[castlingIndex] = 0;
			pieceIds[castlingIndex+2] = 0;
			pieceIds[7+rank] =  4*side;
			pieceIds[5+rank] = noPiece;
			allMoves[7+rank] = findAllPieceMoves(pieceIds,7+rank);
			allMoves[5+rank] = [];
		}
	}
}

function updateMoveTable(pieceIds, allMoves, controllingList, moveOrigin, moveDest){
		numCalls.umt++;
		allMoves[moveOrigin] = [];
		var initPieces = controllingList[moveOrigin];
		var typeId, initPiecePos, finalPiecePos, p, pos, delta;
		var file = moveOrigin%8;
		var rank = moveOrigin>>3;
		for(var i=0; i<initPieces.length; i++){
			initPiecePos = initPieces[i];
			typeId = Math.abs(pieceIds[initPiecePos]);
			delta = Math.sign(file - initPiecePos&7)+ 8*Math.sign(rank - (initPiecePos>>3));
			if(typeId>=3 && typeId<=5 && initPiecePos!==moveDest){		
				pos = moveOrigin;
				p = noPiece;
				while(pos!==-1 && p===noPiece){
					pos = adjustPosition(pos, delta);		
					if(pos!==-1){
						p = pieceIds[pos];
						allMoves[initPiecePos].push(pos);
					}
				}
				
				//allMoves[initPiecePos] = findAllPieceMoves(pieceIds, initPiecePos);
			}
		}
		var finalPieces = controllingList[moveDest];
		
		for(var i=0; i<finalPieces.length; i++){
			finalPiecePos = finalPieces[i];
			typeId = Math.abs(pieceIds[finalPiecePos]);
			if(typeId>=3 && typeId<=5 && finalPiecePos!==moveOrigin){
				allMoves[finalPiecePos] = findAllPieceMoves(pieceIds, finalPiecePos);
			}
		}
		allMoves[moveDest] = findAllPieceMoves(pieceIds, moveDest);
		
		
}


function floodFill(kingSafetyTable, posId){
	if(kingSafetyTable[posId]===0){
		kingSafetyTable[posId] = 1;
	}
	var options = allPieceMoves[6*numSquares+posId];
	var newPos;

	for(var i=0; i<options.length; i++){
		newPos = options[i];
		if(kingSafetyTable[newPos]===0){
			floodFill(kingSafetyTable, newPos);
		}
	}

}

function genKingSafetyTable(pieceIds, side, validMoves){
	var checkTable = [];
	for(var i=0; i<numSquares; i++){
		if(pieceIds[i]*side<=0 || pieceIds[i] ===6*side){
			checkTable[i] = 0;
		}else{
			checkTable[i] = -1;
		}
	}
	for(var i=0; i<numSquares; i++){
		if(pieceIds[i]*side<0){
			if(pieceIds[i]!==-side){
				for(var j=0; j<validMoves[i].length; j++){	
					checkTable[validMoves[i][j]] = -1;			
				}
			}else{
				if(i&7 < 7){
					checkTable[i-8*side+1] = -1;
				}
				if(i&7 > 0){
					checkTable[i-8*side-1] = -1;
				}
			}
		}
	}
	return checkTable;
}


function getNotation(pieceIds, move){
	var promotion = "";
	var finalPosId = pieceIds[move[2]];
	var capture = "";
	var check="";
	var typeId = Math.abs(move[0]);
	var side = Math.sign(move[0]);

	var pieceType = pieceTypes[typeId];
	var idLetters = pieceType;

	if(finalPosId!==noPiece){
		capture="x";
	}else{
		if((Math.abs(move[1] - move[2])===7 || Math.abs(move[1] - move[2])===9) && typeId===1){
			return file[move[1]%8]+"x"+getPosFromId(move[2]);
		}
	}

	if(pieceType==="P"){
		if(capture==="x"){idLetters=file[move[1]%8];}else{idLetters="";}
		if(move[2]<8 || move[2]>=56){
			promotion="=Q";
		}
	}else{
		idLetters=pieceType;
	}

	if(typeId>=2 && typeId<=5){
		var moves;
		var initPositions = [];
		pieceIds[move[2]] = - move[0];
		var capturePositions = findValidPieceMoves(pieceIds,move[2],true)[1];
		for(var i=0; i<capturePositions.length; i++){
			if(Math.abs(pieceIds[capturePositions[i]])===typeId && capturePositions[i]!==move[1]){
				initPositions.push(capturePositions[i]);
			}
		}		
		pieceIds[move[2]] = finalPosId;
		var sameFile = false;
		var sameRank = false;
		for(var i=0; i<initPositions.length; i++){
			if(initPositions[i]%8===move[1]%8){
				sameFile = true;
			}
			if(initPositions[i]>>3===move[1]>>3){
				sameRank = true;
			}
		}
		if(initPositions.length>0){
			if(!sameFile){idLetters+=file[move[1]%8];}
			else if(!sameRank){idLetters+=(move[1]>>3)+1;}
			else{
				idLetters+=getPosFromId(move[1]);
			}
		}
	}
	if(pieceType==="K" && move[1] % 8 === 4){
		if(move[2]%8===6){
			return "O-O";
		}else if(move[2]%8===2){
			return "O-O-O";
		}
	}
	var pieceIds2 = pieceIds.slice();
	makeMove(pieceIds2, move, findAllMoves(pieceIds2));
	if(detectCheck(pieceIds2, -side)){
		if(deepEvaluation(pieceIds2)[0.5+0.5*side]===0){
			check="#";
		}else{
			check="+";
		}
	}
	return idLetters+capture+getPosFromId(move[2])+promotion+check;
}

function applyMove(move){
	if(currentSide===1){
		gameNotation.push([getNotation(pieceIds, move),""]);
	}else{
		gameNotation[gameNotation.length-1][1] = getNotation(pieceIds, move);
	}
	makeMove(pieceIds, move, findAllMoves(pieceIds));
	moveHistory.push(move);
	currentSide = - currentSide;
	game.push(pieceIds.slice());
	setupBoard(pieceIds);
	updateStatus();
	doPlay();
}

function validMove(pieceIds,move){
	var initPos = move[1];
	var finalPos = move[2];
	var pieceId = move[0]; 
	var j = pieceIds[finalPos];
	var valid = true;
	
	if(j*pieceId>0){
		return false;
	}
	pieceIds[initPos]=noPiece;
	pieceIds[finalPos]=pieceId;
	
	if(detectCheck(pieceIds, Math.sign(pieceId))){
		valid = false;
	}
	pieceIds[initPos] = pieceId;
	pieceIds[finalPos] = noPiece;
	
	if(j!==noPiece){
		pieceIds[finalPos] = j;
	}	
	return valid;
}

function findValidKingMoves(pieceIds, position, noCheckAllowed){
	numCalls.k++;
	var positions = [[],[]];
	var pos = position;
	var pieceId = pieceIds[position];
	var side = pieceId > 0 ? 1 : -1;
	var options = kingPaths;
	var p, possibleMove;
	var possibleMoves = allPieceMoves[6*64+position];
	var numMoves = possibleMoves.length;

	for(var i=0; i<numMoves; i++){
		possibleMove = possibleMoves[i];
		p = pieceIds[possibleMove];
		if(!noCheckAllowed || validMove(pieceIds, [pieceId, position, possibleMove])){
			if(p===noPiece){
				positions[0].push(possibleMove);
			}else if(p*pieceId<0){
				positions[1].push(possibleMove);
			}		
		}
	}	
	var row = 28 - 28*side;
	var castlingIndex = 65.5-1.5*side;
	if(pos === row + 4 && pieceIds[castlingIndex]===0 && (!noCheckAllowed || !detectCheck(pieceIds, side))){
		if(pieceIds[castlingIndex+1]===0 && pieceIds[1+row]===noPiece && pieceIds[2+row]===noPiece && pieceIds[3+row]===noPiece && pieceIds[row]===4*side){
			var kingLeftPos = pos - 2;
			if(validMove(pieceIds, [pieceId, position,kingLeftPos])){
				pieceIds[position] = noPiece;
				pieceIds[position-1] = pieceId;
				if(!noCheckAllowed || !detectCheck(pieceIds, side)){
					positions[0].push(kingLeftPos);
				}
				pieceIds[position] = pieceId;
				pieceIds[position-1] = noPiece;
			}
		}
		if(pieceIds[castlingIndex+2]===0 && pieceIds[5+row]===noPiece && pieceIds[6+row]===noPiece && pieceIds[7+row]===4*side){
			var kingRightPos = pos + 2;
			if(validMove(pieceIds, [pieceId, position, kingRightPos])){
				pieceIds[position] = noPiece;
				pieceIds[position+1] = pieceId;
				if(!noCheckAllowed || !detectCheck(pieceIds, side)){
					positions[0].push(kingRightPos);
				}
				pieceIds[position] = pieceId;
				pieceIds[position+1] = noPiece;
			}
		}
	}
	return positions;
}

function findValidPawnMoves(pieceIds, position, noCheckAllowed){
	numCalls.p++;
	var positions = [[],[]];
	var pos = position;
	var pieceId = pieceIds[pos];
	var side = pieceId > 0 ? 1 : -1;
	var leftCapturePos = pos+8*side-1;
	var rightCapturePos = pos+8*side+1;
	if((pos&7)>0 && pieceIds[leftCapturePos]*side < 0){		
		if(!noCheckAllowed || validMove(pieceIds, [pieceId, position, leftCapturePos])){
			positions[1].push(leftCapturePos);	
		}
	}

	if((pos&7)<7 && pieceIds[rightCapturePos]*side < 0){
		if(!noCheckAllowed || validMove(pieceIds, [pieceId, position, rightCapturePos])){
			positions[1].push(rightCapturePos);	
		}
	}
	if(pos>>3 == 3.5 + 0.5*side){
		var move = moveHistory[moveHistory.length-1];
		if(move){
			var moveDest = move[2];
			var moveOrigin = move[1];
			if(move[0] === -side && (moveOrigin>>3===3.5+2.5*side)){
				var enPassantLeft = adjustPosition(pos, -1);
				var enPassantRight = adjustPosition(pos, 1);
				var enl = pieceIds[enPassantLeft];
				var enr = pieceIds[enPassantRight];
				
				if(enPassantLeft!==-1 && enl*side<0 && moveDest===enPassantLeft){
					leftCapturePos = adjustPosition(pos, -1+8*side);
					if(!noCheckAllowed){
						positions[1].push(leftCapturePos);
					}else{
						var initPos = position;
						pieceIds[leftCapturePos]=pieceId;
						pieceIds[initPos]=noPiece;
						pieceIds[enPassantLeft]=noPiece;
						if(!detectCheck(pieceIds, side)){
							positions[1].push(leftCapturePos);
						}
						pieceIds[enPassantLeft] = enl;	
						pieceIds[leftCapturePos]= noPiece;
						pieceIds[initPos]=pieceId;
					}
				}
				
				if(enPassantRight!==-1 && enr*side<0 && moveDest===enPassantRight){
					rightCapturePos = adjustPosition(pos, side*8+1);
					if(!noCheckAllowed){
						positions[1].push(rightCapturePos);
					}else{
						var initPos = position;
						pieceIds[rightCapturePos]=pieceId;
						pieceIds[initPos]=noPiece;
						pieceIds[enPassantRight]=noPiece;
						if(!detectCheck(pieceIds, side)){
							positions[1].push(rightCapturePos);
						}
						pieceIds[enPassantRight] = enr;	
						pieceIds[rightCapturePos]= noPiece;
						pieceIds[initPos]=pieceId;
					}
				}
			}
		}
	}	
	var forwardPos =  pos + 8*side;
	if(pieceIds[forwardPos]===noPiece){
		var doubleForwardPos = pos + 16*side;
		if(!noCheckAllowed || validMove(pieceIds,[pieceId, pos, forwardPos])){
			positions[0].push(forwardPos);
		}
		if(pos>>3===3.5-2.5*side && pieceIds[doubleForwardPos]===noPiece){
			if(!noCheckAllowed || validMove(pieceIds,[pieceId, pos, doubleForwardPos])){
				positions[0].push(doubleForwardPos);	
			}
		}
	}
	return positions;
}

function findValidPieceMoves(pieceIds, position, noCheckAllowed){
	numCalls.vMoves++;
	var positions = [[],[]];
	var pieceId = pieceIds[position];
	var typeId = Math.abs(pieceId);
	var numPaths;
	var p, j;
	var pos;
	var possibleMoves, numMoves, possibleRays, possibleMove;
	
	switch(typeId){
		case 1: positions = findValidPawnMoves(pieceIds, position, noCheckAllowed); break;
		case 3:
		case 4:
		case 5:
			possibleRays = allPieceMoves[typeId*numSquares+position];
			numPaths = possibleRays.length;
			for(var i=0; i<numPaths; i++){
				possibleMoves = possibleRays[i];
				numMoves = possibleMoves.length;
				j=0;
				p=noPiece;
				while(p===noPiece && j<numMoves){		
					possibleMove = possibleMoves[j];
					p = pieceIds[possibleMove];
					if(p===noPiece){
						if(!noCheckAllowed || validMove(pieceIds,[pieceId, position, possibleMove])){		
							positions[0].push(possibleMove);					
						}
						
					}
					else if(p*pieceId<0){
						if(!noCheckAllowed || validMove(pieceIds,[pieceId, position, possibleMove])){
							positions[1].push(possibleMove);
						}
					}	
					j++;
				}
			}
			break;
		case 2:
			possibleMoves = allPieceMoves[2*numSquares+position];
			numMoves = possibleMoves.length;
			for(var i=0; i<numMoves; i++){
				possibleMove = possibleMoves[i];
				p = pieceIds[possibleMove];
				if(p===noPiece){
					if(!noCheckAllowed || validMove(pieceIds,[pieceId, position, possibleMove])){		
						positions[0].push(possibleMove);					
					}
				}else if(p*pieceId<0){
					if(!noCheckAllowed || validMove(pieceIds,[pieceId, position, possibleMove])){
						positions[1].push(possibleMove);
					}
				}					
			}	
			break;
		case 6:
			positions = findValidKingMoves(pieceIds, position, noCheckAllowed);
			break;
		
	default: return [];
	}	
	return positions;
}

function adjustPosition(pos, delta){
	var file = (pos & 7)+((delta+20) & 7) - 4;
	var finalNum; 
	if(file<8 && file>=0){
		finalNum = pos+delta;
		if(finalNum<numSquares && finalNum>=0){
			return finalNum;
		}
	}
	return -1;
}


function kingFreedom(pieceIds, side, validMoves, position){
	var kingSafetyTable = genKingSafetyTable(pieceIds, side, validMoves);
	var count = 0;
	floodFill(kingSafetyTable, position);
	for(var i=0; i<numSquares; i++){
		if(kingSafetyTable[i]===1){
			count++;
		}
	}
	return count;
}

function evaluateBoard(pieceIds, allMoves){
	numCalls.eval++;
	var scores = [];
	var mobilityScore = [0,0];
	var materialScore = [0,0];
	var kingFreedomScore = [0,0];
	var pieceId;
	var validMoves; 
	for(var i=0; i<numSquares; i++){
		pieceId = pieceIds[i];
		if(pieceId>0){
			if(pieceId!== 6){
				mobilityScore[0]+= allMoves[i].length;
			}
			materialScore[0]+= pieceValues[pieceId];
		}else if(pieceId<0){
			if(pieceId!==-6){
				mobilityScore[1]+= allMoves[i].length;
			}
			materialScore[1]+= pieceValues[-pieceId];
		}
		
	}
	if(materialScore[0] < endGameNum || materialScore[1] < endGameNum){
		kingFreedomScore[0] = kingFreedom(pieceIds, 1, allMoves, findPieceId(pieceIds, 6));
		kingFreedomScore[1] = kingFreedom(pieceIds, -1, allMoves, findPieceId(pieceIds, -6));
	}
	scores[0] = mobilityScore[0]*squaresWeight+materialScore[0]+kingFreedomScore[0];
	scores[1] = mobilityScore[1]*squaresWeight+materialScore[1]+kingFreedomScore[1];
	return scores;
}

function deepEvaluation(pieceIds){
	var scores = [0, 0];
	var mobilityScore = [0,0];
	var materialScore = [0,0];
	var kingFreedomScore = [0, 0];
	var possibleMoves;
	for(var i=0; i<numSquares; i++){
			if(pieceIds[i]>0){
				possibleMoves = findValidPieceMoves(pieceIds, i, true);
				mobilityScore[0]+= possibleMoves[0].length+possibleMoves[1].length;
				materialScore[0]+= pieceValues[pieceIds[i]];
			}else if(pieceIds[i]<0){
				possibleMoves = findValidPieceMoves(pieceIds, i, true);
				mobilityScore[1]+= possibleMoves[0].length+possibleMoves[1].length;
				materialScore[1]+= pieceValues[-pieceIds[i]];
			}
		}
	
	var validMoves = findValidMoves(pieceIds, false);
	kingFreedomScore[0] = kingFreedom(pieceIds, 1, validMoves, findPieceId(pieceIds, 6));
	kingFreedomScore[1] = kingFreedom(pieceIds, -1, validMoves, findPieceId(pieceIds, -6));

	scores[0] = mobilityScore[0]*5+materialScore[0]+kingFreedomScore[0]-1;
	scores[1] = mobilityScore[1]*5+materialScore[1]+kingFreedomScore[1]-1;

	if(mobilityScore[0]===0){
		scores[0] = 0;
		if(!detectCheck(pieceIds, 1)){
			scores[1]=0;
		}
	}
	if(mobilityScore[1]===0){
		scores[1] = 0;
		if(!detectCheck(pieceIds, -1)){
			scores[0]=0;
		}
	}

	return scores;
}

function findPieceId(pieceIds, pieceId){
	if(pieceId>0){
		for(var i=0; i<numSquares; i++){
			if(pieceIds[i]===pieceId){return i;}
		}
	}else{
		for(var i=numSquares-1; i>=0; i--){
			if(pieceIds[i]===pieceId){return i;}
		}
	}
	return -1;
}

function detectCheck(pieceIds,side){
	numCalls.check++;
	var possibleThreats, numThreats;
	var pos = findPieceId(pieceIds, 6*side);
	if(pos === -1){
		return true;
	}
	var pLeft = adjustPosition(pos, -1+side*8);
	var pRight = adjustPosition(pos, 1+side*8);
	if((pRight!==-1 && pieceIds[pRight] === -side) || (pLeft!==-1 && pieceIds[pLeft] ===  -side)){
		return true;
	} 
	var moves = kingPaths;
	var possibleMove;
	for(var i=0; i<8; i++){
		possibleMove = adjustPosition(pos, moves[i]);
		if(possibleMove!==-1 && pieceIds[possibleMove]===-6*side){
			return true;
		}
	}
	var threatType, pieceId, pieceType, testPiece;
	for(var j=2; j<=4; j++){
		pieceIds[pos] = j*side;
		possibleThreats = findValidPieceMoves(pieceIds, pos, false)[1];
		numThreats = possibleThreats.length;
		for(var i=0; i<numThreats; i++){
			pieceId = pieceIds[possibleThreats[i]];
			if(pieceId === - j*side || (j!==2 && pieceId===-5*side)){
				pieceIds[pos] = 6*side;
				return true;
			}
		}
	}
	pieceIds[pos] = 6*side;
	return false;
}

function getPosFromId(id){
	return file[id&7]+((id>>3)+1);
}

function setupBoard(pieceIds){
	var piecesDOM = document.getElementById("pieces");
	var pieceHTML = "";
	for(var i=0; i<numSquares; i++){
		if(pieceIds[i]!==0){
			pieceHTML+=addPiece(pieceIds[i], i, piecesDOM);
		}
	}
	piecesDOM.innerHTML = pieceHTML;
}
function addPiece(pieceId, position, piecesDOM){
	var left = (12 + 52*(position%8)).toString();
	var top = (7*52 + 12 - 52*(position>>3)).toString();
	var color;
	if(pieceId<0){
		color = "b";
	}else{
		color = "w";	
	}
	var image = pieceTypes[Math.abs(pieceId)].toLowerCase()+color;
	return '<img src="'+image+'.png" id="piece-'+position+'" style="position:absolute; left:'+left+'px;top:'+top+'px;'
	+'" onclick="startMove('+position+','+Math.sign(pieceId)+')"></img>';
}
function updateStatus(){
	var scores = deepEvaluation(pieceIds);
	var notationStr = "";
	for(var i=0; i<gameNotation.length; i++){
		notationStr+=(i+1)+". "+gameNotation[i][0]+" "+gameNotation[i][1]+" ";
	}	
	document.getElementById("history").innerHTML = notationStr;
	document.getElementById("scores").innerHTML="White: "+scores[0]+", Black: "+scores[1];
	if(detectCheck(pieceIds,1) || detectCheck(pieceIds, -1)){
		if(scores[0]===0){
			document.getElementById("status").innerHTML="Checkmate! Black wins!";
		}else if(scores[1]===0){
			document.getElementById("status").innerHTML="Checkmate! White wins!";
		}else{
			document.getElementById("status").innerHTML="Check!";
		}
	}else{
		if(scores[0]===0 || scores[1]===0){
			document.getElementById("status").innerHTML="Stalemate!";
		}else{
			document.getElementById("status").innerHTML="";
		}
	}
}
function highlightMoves(rays){
	document.getElementById("moves").innerHTML="";
	var moves;
	for(var i=0; i<rays.length; i++){
		moves = rays[i];
		for(var j=0; j<moves.length;j++){
			var left = (8+52*(moves[j]%8)).toString();
			var top = (7*52 + 8-52*(moves[j]>>3)).toString();
			document.getElementById("moves").innerHTML+='<div style="position:absolute; left:'+left+'px;top:'+top+'px; height:52px; width:52px; background-color: rgba(255, 255, 0, 0.2)"></div>';
		}
	}
}
function getCell(x, y){
	var row = Math.ceil((-y+10)/52)+7;
	var col = Math.floor((x-10)/52);
	return col+row*8;
}
function startMove(initPos, side){
	if(side===currentSide && !pendingMove){
		pendingMove = true;
		document.getElementById("piece-"+initPos).style.WebkitFilter='drop-shadow(1px 1px 0 yellow) drop-shadow(-1px 1px 0 yellow) drop-shadow(1px -1px 0 yellow) drop-shadow(-1px -1px 0 yellow)';
		var possibleRays = findValidPieceMoves(pieceIds, initPos, true);
		highlightMoves(possibleRays);
		document.addEventListener('mouseup', function fmove() {
			var cell = getCell(event.clientX,event.clientY);
			if(cell!==initPos){
				var valid = false;
				for(var i=0; i<possibleRays.length; i++){
					for(var j=0; j<possibleRays[i].length; j++){
						if(possibleRays[i][j]===cell){
							valid = true;
						}	
					}
				}
				if(valid){
					applyMove([pieceIds[initPos], initPos, cell]);
				}else{
					document.getElementById("piece-"+initPos).style.WebkitFilter='none';
					
					document.removeEventListener('mouseup', fmove);
				}
				document.getElementById("moves").innerHTML="";	
			}
			pendingMove=false;
			document.removeEventListener('mouseup', fmove);
		});
	}
}
function startGame(){
    init();
    doPlay();
}

function doPlay(){
	var compPlayer= parseInt(document.getElementById("compPlayer").value);
    if(compPlayer===currentSide || compPlayer===2){
        document.getElementById("pending").style.visibility = "visible";
        setTimeout(play, 200);
    }else{
        document.getElementById("pending").style.visibility = "hidden";
    }
}

function undo(){
	document.getElementById("moves").innerHTML="";
	if(game.length>1){
		currentSide = -currentSide;
		game.pop();
		if(currentSide===1){
			gameNotation.pop();
		}else{
			gameNotation[gameNotation.length-1][1] = "";
		}
		moveHistory.pop();
		pieceIds = game[game.length-1].slice();
		setupBoard(pieceIds);
		updateStatus();
	}
}

function MTDf(pieceIds,guess, depth, maxDepth){
	//numCalls.mtdF++;
	var lower = -winScore;
	var upper = winScore; 
	var mtdBestMoves;
	while(lower<upper){
		if(guess === lower){ beta = guess + 1;} else {beta = guess;}
		mtdBestMoves = findBestMove(pieceIds, findAllMoves(pieceIds), currentSide, depth, maxDepth,  beta - 1, beta);
		//numCalls.mtdF++;
		guess = mtdBestMoves[2];
		if(guess<beta){upper = guess;}else{lower = guess;}
	}
	return mtdBestMoves;
}

function play(){
    var level = parseInt(document.getElementById("level").value);
	//var beta;
	//var bestScore = 0;
	/*
	var initLevel = 1;
	if(level%2===0){
		initLevel = 2;
	}
	for(var i=initLevel; i<=level; i+=2){
		bestMoves = MTDf(pieceIds, bestScore, i, level);
		bestScore = bestMoves[2];
	}
	*/
	
	bestMove = findBestMove(pieceIds, findAllMoves(pieceIds),currentSide, level,level, -winScore, winScore);
	if(bestMove.length>3){
		//var randNum = Math.floor(((bestMove.length-3)/3)*Math.random())*3+3;
		//var bestMove = bestMove.slice(3, 6);
		applyMove(bestMove.slice(3, 6));
	}
	updateStatus();
	if(Object.keys(bestMoveTable).length>1000000){
		bestMoveTable = {};
	}
	document.getElementById("pending").style.visibility = "hidden";
}
