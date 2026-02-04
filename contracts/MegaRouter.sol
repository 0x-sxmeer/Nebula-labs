// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

struct SwapStep {
    address target;
    bytes callData;
    address tokenIn;
    address tokenOut;
    uint256 amountIn;
}

struct Route {
    SwapStep[] steps;
    uint256 amountIn;
    uint256 minOut;
}

contract MegaRouter is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    error ExecutionFailed(uint256 stepIndex);
    error SlippageExceeded(uint256 received, uint256 expected);
    error Expired();
    error InvalidStep();
    error UntrustedTarget(address target);
    error InsufficientOutput(uint256 received, uint256 minimum);

    event SwapExecuted(
        address indexed user,
        address indexed fromToken,
        address indexed toToken,
        uint256 amountIn,
        uint256 amountOut,
        address recipient
    );

    event TargetApproved(address indexed target, bool approved);

    mapping(address => bool) public approvedTargets;
    
    address private constant ETH = address(0);

    constructor() Ownable(msg.sender) {}

    function setApprovedTarget(address target, bool approved) external onlyOwner {
        approvedTargets[target] = approved;
        emit TargetApproved(target, approved);
    }

    function setApprovedTargets(address[] calldata targets, bool approved) external onlyOwner {
        for (uint256 i = 0; i < targets.length; i++) {
            approvedTargets[targets[i]] = approved;
            emit TargetApproved(targets[i], approved);
        }
    }

    function executeSplitSwap(
        Route[] calldata routes,
        address to,
        uint256 deadline
    ) external payable nonReentrant returns (uint256 totalOutput) {
        if (block.timestamp > deadline) revert Expired();
        require(to != address(0), "Invalid recipient");
        
        for (uint256 i = 0; i < routes.length; i++) {
            totalOutput += _executeRoute(routes[i], to);
        }
    }

    function _executeRoute(
        Route calldata route,
        address recipient
    ) internal returns (uint256 finalOutput) {
        if (route.steps.length == 0) revert InvalidStep();
        
        address currentToken = route.steps[0].tokenIn;
        uint256 currentAmount = route.amountIn;

        // 1. Transfer initial tokens from user
        if (currentToken != ETH) {
            IERC20(currentToken).safeTransferFrom(
                msg.sender,
                address(this),
                currentAmount
            );
        } else {
            require(msg.value >= currentAmount, "Insufficient ETH");
            currentAmount = msg.value;
        }

        // 2. Execute each swap step
        for (uint256 j = 0; j < route.steps.length; j++) {
            SwapStep memory step = route.steps[j];
            
            // Validate target is approved
            if (!approvedTargets[step.target]) {
                revert UntrustedTarget(step.target);
            }
            
            // Get balance before swap
            uint256 balanceBefore = _getBalance(step.tokenOut);
            
            // Approve token if needed
            if (step.tokenIn != ETH && step.amountIn > 0) {
                IERC20(step.tokenIn).forceApprove(step.target, step.amountIn);
            }

            // Execute the swap
            (bool success, bytes memory returnData) = step.target.call{
                value: step.tokenIn == ETH ? step.amountIn : 0
            }(step.callData);
            
            if (!success) {
                // Extract revert reason if available
                if (returnData.length > 0) {
                    assembly {
                        let returndata_size := mload(returnData)
                        revert(add(32, returnData), returndata_size)
                    }
                }
                revert ExecutionFailed(j);
            }

            // Calculate actual output received
            uint256 balanceAfter = _getBalance(step.tokenOut);
            currentAmount = balanceAfter - balanceBefore;
            
            // Update current token
            currentToken = step.tokenOut;
            
            // Reset approval to 0 for security
            if (step.tokenIn != ETH) {
                IERC20(step.tokenIn).forceApprove(step.target, 0);
            }
        }

        // 3. Verify minimum output
        if (currentAmount < route.minOut) {
            revert SlippageExceeded(currentAmount, route.minOut);
        }

        // 4. Transfer final output to recipient
        finalOutput = currentAmount;
        if (currentToken != ETH) {
            IERC20(currentToken).safeTransfer(recipient, finalOutput);
        } else {
            (bool sent, ) = payable(recipient).call{value: finalOutput}("");
            require(sent, "ETH transfer failed");
        }

        emit SwapExecuted(
            msg.sender,
            route.steps[0].tokenIn,
            currentToken,
            route.amountIn,
            finalOutput,
            recipient
        );
    }

    function _getBalance(address token) internal view returns (uint256) {
        if (token == ETH) {
            return address(this).balance;
        }
        return IERC20(token).balanceOf(address(this));
    }

    // Emergency withdrawal function
    function emergencyWithdraw(address token, address to) external onlyOwner {
        if (token == ETH) {
            payable(to).transfer(address(this).balance);
        } else {
            uint256 balance = IERC20(token).balanceOf(address(this));
            IERC20(token).safeTransfer(to, balance);
        }
    }

    receive() external payable {}
}
