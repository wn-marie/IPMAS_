"""
IPMAS2 Model Results Visualization
====================================
Creates comprehensive visualizations for ML model evaluation
"""

import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
import numpy as np
from pathlib import Path
import warnings
warnings.filterwarnings('ignore')

# Set style
plt.style.use('seaborn-v0_8-darkgrid')
sns.set_palette("husl")

class ModelVisualizer:
    """
    Create visualizations for model evaluation and analysis
    """
    
    def __init__(self, output_dir='datasets/processed/visualizations'):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def plot_predictions_vs_actual(self, y_true, y_pred, model_name='Model', save=True):
        """
        Scatter plot: Predictions vs Actual values
        """
        fig, ax = plt.subplots(figsize=(10, 8))
        
        # Scatter plot
        ax.scatter(y_true, y_pred, alpha=0.6, s=50, edgecolors='black', linewidth=0.5)
        
        # Perfect prediction line
        min_val = min(y_true.min(), y_pred.min())
        max_val = max(y_true.max(), y_pred.max())
        ax.plot([min_val, max_val], [min_val, max_val], 'r--', lw=2, label='Perfect Prediction')
        
        # Calculate R² for annotation
        from sklearn.metrics import r2_score
        r2 = r2_score(y_true, y_pred)
        
        ax.set_xlabel('Actual Poverty Index', fontsize=12, fontweight='bold')
        ax.set_ylabel('Predicted Poverty Index', fontsize=12, fontweight='bold')
        ax.set_title(f'{model_name}: Predictions vs Actual (R² = {r2:.4f})', 
                    fontsize=14, fontweight='bold')
        ax.legend(fontsize=10)
        ax.grid(True, alpha=0.3)
        
        plt.tight_layout()
        
        if save:
            filename = self.output_dir / f'{model_name.lower().replace(" ", "_")}_predictions_vs_actual.png'
            plt.savefig(filename, dpi=300, bbox_inches='tight')
            print(f"   ✅ Saved: {filename}")
        
        return fig
    
    def plot_residuals(self, y_true, y_pred, model_name='Model', save=True):
        """
        Residual plot: Shows prediction errors
        """
        residuals = y_true - y_pred
        
        fig, axes = plt.subplots(1, 2, figsize=(15, 6))
        
        # Residuals vs Predicted
        axes[0].scatter(y_pred, residuals, alpha=0.6, s=50, edgecolors='black', linewidth=0.5)
        axes[0].axhline(y=0, color='r', linestyle='--', lw=2)
        axes[0].set_xlabel('Predicted Poverty Index', fontsize=12, fontweight='bold')
        axes[0].set_ylabel('Residuals (Actual - Predicted)', fontsize=12, fontweight='bold')
        axes[0].set_title('Residuals vs Predicted', fontsize=13, fontweight='bold')
        axes[0].grid(True, alpha=0.3)
        
        # Residuals distribution
        axes[1].hist(residuals, bins=30, edgecolor='black', alpha=0.7, color='skyblue')
        axes[1].axvline(x=0, color='r', linestyle='--', lw=2)
        axes[1].set_xlabel('Residuals', fontsize=12, fontweight='bold')
        axes[1].set_ylabel('Frequency', fontsize=12, fontweight='bold')
        axes[1].set_title('Residuals Distribution', fontsize=13, fontweight='bold')
        axes[1].grid(True, alpha=0.3)
        
        plt.suptitle(f'{model_name} Residual Analysis', fontsize=14, fontweight='bold', y=1.02)
        plt.tight_layout()
        
        if save:
            filename = self.output_dir / f'{model_name.lower().replace(" ", "_")}_residuals.png'
            plt.savefig(filename, dpi=300, bbox_inches='tight')
            print(f"   ✅ Saved: {filename}")
        
        return fig
    
    def plot_feature_importance(self, model, feature_names, model_name='Model', top_n=20, save=True):
        """
        Feature importance plot (for tree-based models)
        """
        try:
            # Get feature importance
            if hasattr(model, 'feature_importances_'):
                importances = model.feature_importances_
            elif hasattr(model, 'coef_'):
                importances = np.abs(model.coef_)
            else:
                print(f"   ⚠️ {model_name} does not have feature importance")
                return None
            
            # Create DataFrame
            importance_df = pd.DataFrame({
                'feature': feature_names[:len(importances)],
                'importance': importances
            }).sort_values('importance', ascending=False).head(top_n)
            
            # Plot
            fig, ax = plt.subplots(figsize=(10, max(8, top_n * 0.4)))
            
            y_pos = np.arange(len(importance_df))
            ax.barh(y_pos, importance_df['importance'], color='steelblue', edgecolor='black')
            ax.set_yticks(y_pos)
            ax.set_yticklabels(importance_df['feature'], fontsize=10)
            ax.set_xlabel('Feature Importance', fontsize=12, fontweight='bold')
            ax.set_title(f'{model_name}: Top {top_n} Most Important Features', 
                        fontsize=14, fontweight='bold')
            ax.grid(True, alpha=0.3, axis='x')
            
            plt.tight_layout()
            
            if save:
                filename = self.output_dir / f'{model_name.lower().replace(" ", "_")}_feature_importance.png'
                plt.savefig(filename, dpi=300, bbox_inches='tight')
                print(f"   ✅ Saved: {filename}")
            
            return fig, importance_df
            
        except Exception as e:
            print(f"   ⚠️ Error creating feature importance plot: {e}")
            return None, None
    
    def plot_model_comparison(self, results_dict, save=True):
        """
        Compare multiple models side by side
        """
        # Extract metrics
        models = list(results_dict.keys())
        r2_scores = [results_dict[m]['r2'] for m in models]
        mse_scores = [results_dict[m]['mse'] for m in models]
        mae_scores = [results_dict[m]['mae'] for m in models]
        
        fig, axes = plt.subplots(1, 3, figsize=(18, 6))
        
        # R² Scores
        axes[0].bar(models, r2_scores, color='green', alpha=0.7, edgecolor='black')
        axes[0].set_ylabel('R² Score', fontsize=12, fontweight='bold')
        axes[0].set_title('R² Score Comparison', fontsize=13, fontweight='bold')
        axes[0].set_ylim([0, 1])
        axes[0].grid(True, alpha=0.3, axis='y')
        for i, v in enumerate(r2_scores):
            axes[0].text(i, v + 0.02, f'{v:.3f}', ha='center', fontweight='bold')
        
        # MSE Scores
        axes[1].bar(models, mse_scores, color='red', alpha=0.7, edgecolor='black')
        axes[1].set_ylabel('Mean Squared Error', fontsize=12, fontweight='bold')
        axes[1].set_title('MSE Comparison (Lower is Better)', fontsize=13, fontweight='bold')
        axes[1].grid(True, alpha=0.3, axis='y')
        for i, v in enumerate(mse_scores):
            axes[1].text(i, v + max(mse_scores)*0.05, f'{v:.1f}', ha='center', fontweight='bold')
        
        # MAE Scores
        axes[2].bar(models, mae_scores, color='orange', alpha=0.7, edgecolor='black')
        axes[2].set_ylabel('Mean Absolute Error', fontsize=12, fontweight='bold')
        axes[2].set_title('MAE Comparison (Lower is Better)', fontsize=13, fontweight='bold')
        axes[2].grid(True, alpha=0.3, axis='y')
        for i, v in enumerate(mae_scores):
            axes[2].text(i, v + max(mae_scores)*0.05, f'{v:.2f}', ha='center', fontweight='bold')
        
        plt.suptitle('Model Performance Comparison', fontsize=16, fontweight='bold', y=1.02)
        plt.tight_layout()
        
        if save:
            filename = self.output_dir / 'model_comparison.png'
            plt.savefig(filename, dpi=300, bbox_inches='tight')
            print(f"   ✅ Saved: {filename}")
        
        return fig
    
    def plot_prediction_distribution(self, y_true, y_pred_dict, save=True):
        """
        Compare distributions of actual vs predicted values
        """
        n_models = len(y_pred_dict)
        fig, axes = plt.subplots(1, n_models + 1, figsize=(6 * (n_models + 1), 6))
        
        if n_models == 0:
            return None
        
        # Actual distribution
        axes[0].hist(y_true, bins=30, color='steelblue', alpha=0.7, edgecolor='black')
        axes[0].set_title('Actual Poverty Index', fontsize=13, fontweight='bold')
        axes[0].set_xlabel('Poverty Index', fontsize=11)
        axes[0].set_ylabel('Frequency', fontsize=11)
        axes[0].grid(True, alpha=0.3, axis='y')
        
        # Predicted distributions
        for idx, (model_name, y_pred) in enumerate(y_pred_dict.items(), 1):
            axes[idx].hist(y_pred, bins=30, color='coral', alpha=0.7, edgecolor='black')
            axes[idx].set_title(f'{model_name} Predictions', fontsize=13, fontweight='bold')
            axes[idx].set_xlabel('Poverty Index', fontsize=11)
            axes[idx].set_ylabel('Frequency', fontsize=11)
            axes[idx].grid(True, alpha=0.3, axis='y')
        
        plt.suptitle('Distribution Comparison: Actual vs Predicted', 
                    fontsize=14, fontweight='bold', y=1.02)
        plt.tight_layout()
        
        if save:
            filename = self.output_dir / 'prediction_distributions.png'
            plt.savefig(filename, dpi=300, bbox_inches='tight')
            print(f"   ✅ Saved: {filename}")
        
        return fig
    
    def plot_error_by_range(self, y_true, y_pred, model_name='Model', save=True):
        """
        Analyze prediction errors across different poverty index ranges
        """
        errors = np.abs(y_true - y_pred)
        
        # Create bins
        bins = [0, 30, 50, 70, 100]
        labels = ['Low (0-30)', 'Moderate (30-50)', 'High (50-70)', 'Critical (70-100)']
        
        y_true_binned = pd.cut(y_true, bins=bins, labels=labels, include_lowest=True)
        
        error_by_range = pd.DataFrame({
            'poverty_range': y_true_binned,
            'error': errors
        }).groupby('poverty_range')['error'].agg(['mean', 'std', 'count'])
        
        fig, ax = plt.subplots(figsize=(10, 6))
        
        x_pos = np.arange(len(error_by_range))
        ax.bar(x_pos, error_by_range['mean'], yerr=error_by_range['std'], 
              color='steelblue', alpha=0.7, edgecolor='black', capsize=5)
        ax.set_xticks(x_pos)
        ax.set_xticklabels(error_by_range.index, fontsize=11)
        ax.set_ylabel('Mean Absolute Error', fontsize=12, fontweight='bold')
        ax.set_xlabel('Poverty Index Range', fontsize=12, fontweight='bold')
        ax.set_title(f'{model_name}: Prediction Error by Poverty Range', 
                    fontsize=14, fontweight='bold')
        ax.grid(True, alpha=0.3, axis='y')
        
        # Add count annotations
        for i, (idx, row) in enumerate(error_by_range.iterrows()):
            ax.text(i, row['mean'] + row['std'] + 0.5, f'n={int(row["count"])}', 
                   ha='center', fontsize=9)
        
        plt.tight_layout()
        
        if save:
            filename = self.output_dir / f'{model_name.lower().replace(" ", "_")}_error_by_range.png'
            plt.savefig(filename, dpi=300, bbox_inches='tight')
            print(f"   ✅ Saved: {filename}")
        
        return fig
    
    def create_full_report(self, results_dict, X_test, y_test, feature_names, save=True):
        """
        Create comprehensive visualization report
        """
        print("\n📊 Creating visualization report...")
        
        # Model comparison
        self.plot_model_comparison(results_dict, save=save)
        
        # Individual model plots
        y_pred_dict = {}
        for model_name, metrics in results_dict.items():
            y_pred = metrics['predictions']
            y_pred_dict[model_name] = y_pred
            
            # Predictions vs Actual
            self.plot_predictions_vs_actual(y_test, y_pred, model_name, save=save)
            
            # Residuals
            self.plot_residuals(y_test, y_pred, model_name, save=save)
            
            # Feature importance
            if 'model' in metrics:
                self.plot_feature_importance(metrics['model'], feature_names, model_name, save=save)
            
            # Error by range
            self.plot_error_by_range(y_test, y_pred, model_name, save=save)
        
        # Distribution comparison
        self.plot_prediction_distribution(y_test, y_pred_dict, save=save)
        
        print(f"\n✅ Visualization report created in {self.output_dir}/")
        
        return self.output_dir


if __name__ == '__main__':
    print("📊 Model Visualizer - Use with ML pipeline results")
    print("Run ml_pipeline.py first to generate results, then use:")
    print("  visualizer = ModelVisualizer()")
    print("  visualizer.create_full_report(results, X_test, y_test, feature_names)")
